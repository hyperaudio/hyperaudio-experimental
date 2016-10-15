import debug from 'debug';
import $ from 'jquery';
import rangy from 'rangy';
import Tether from 'tether';

const d = debug('ha');

// PLAYER

const setHead = ($player, $video, time) => {
  $player.find(`article > section[data-src="${$video.attr('src')}"]`).each((s, section) => {
    const $section = $(section);
    const words = $section.find('> p > span');

    const start = $(words[0]).data('m');
    const end = $(words[words.length - 1]).data('m');

    if (time < start || time > end) {
      $section.find('p.active').removeClass('active');
      return;
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const $word = $(word);

      if ($word.data('m') > time) {
        if ($word.hasClass('head')) break;

        // debug:
        $word.addClass('high');
        setTimeout(() => { $word.removeClass('high'); }, 200);

        $word.addClass('head').parent().addClass('active');
        $player.find('article span.head').not(word).each((h, head) => {
          if ($(head).data('m') !== $word.data('m')) $(head).removeClass('head');
        });

        $section.find('p.active').not($word.parent()).removeClass('active');

        // TODO scroll if available and only in active section
        // words[i].scrollIntoView({ block: 'end', behavior: 'smooth' });
        break;
      }
    }
  });
};

const hookVideos = ($player) => {
  $player.find('video').each((v, video) => {
    const $video = $(video);

    if (! $video.hasClass('hyperaudio-enabled')) {
      $video.on('timeupdate', () => {
        const time = video.currentTime * 1000;
        setHead($player, $video, time);
      }).addClass('hyperaudio-enabled');
    }
  });
};

$('.hyperaudio-player').each((p, player) => {
  const $player = $(player);

  $player.click((e) => {
    const m = $(e.target).data('m');
    if (!isNaN(m)) {
      const $section = $(e.target).closest('section').addClass('active');
      $player.find('article section.active').not($section).removeClass('active');

      const src = $section.data('src');

      let videoElements = $player.find('.hyperaudio-media video');
      if (videoElements.length === 0) videoElements = $player.find('video');
      if (videoElements.length === 0) {
        // create video element
      } else {
        for (const video of videoElements) {
          if ($(video).attr('src') === src) {
            video.currentTime = m / 1000;
            break;
          }
        }
      }
    }

    hookVideos($player);
  });

  hookVideos($player);
});


// PAD

if (!rangy.initialized) rangy.init();

const $source = $('#player');
let tether;

$source.find('article').mouseup(() => {
  const selection = rangy.getSelection();

  const range = rangy.createRange();
  let anchor = selection.anchorNode.parentNode;

  let start = selection.anchorNode.parentNode;
  let end = selection.focusNode.parentNode;

  if (start.parentNode !== end.parentNode) {
    anchor = anchor.parentNode;
    start = start.parentNode;
    end = end.parentNode;
  }

  range.setStartBefore(start);
  range.setEndAfter(end);
  selection.setSingleRange(range);

  if (range.canSurroundContents()) {
    const mask = $('<div class="mask" draggable="true"></div>').html(selection.toHtml());
    // const mask = $('<div class="mask" draggable="true"></div>').append($(anchor).clone());
    mask.find('.head').removeClass('head');
    mask.find('.active').removeClass('active');
    mask.find('[class]').removeAttr('class');

    const html = mask.html(); // selection.toHtml()
    // d(html);

    d(anchor.nodeName);
    if (anchor.nodeName === 'P') {
      mask.width($(anchor).width());
      mask.data('html', html);
    } else {
      mask.css('max-width', $(anchor).parent().width());
      mask.data('html', `<p>${html}</p>`);
    }

    mask.appendTo($source.find('article section'));
    mask.on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('html', mask.data('html'));
      e.originalEvent.dataTransfer.setData('src', $source.find('article section').data('src'));
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
    });

    if (tether) tether.destroy();
    $('.tether-element').remove();

    tether = new Tether({
      element: mask,
      target: anchor,
      attachment: 'top left',
      targetAttachment: 'top left',
      targetOffset: '1px 0',
    });
  }

  selection.removeAllRanges();
});


const $remixer = $('#remixer');

$remixer.find('article').on('dragover', (e) => {
  e.preventDefault();
}).on('drop', (e) => {
  e.preventDefault();

  if (tether) tether.destroy();
  $('.tether-element').remove();

  const html = e.originalEvent.dataTransfer.getData('html');
  const src = e.originalEvent.dataTransfer.getData('src');
  const section = $('<section></section>');
  section.attr('data-src', src);
  section.html(html);

  const videoElements = $remixer.find('>header video');
  let found = false;
  for (const video of videoElements) {
    if ($(video).attr('src') === src) {
      found = true;
      break;
    }
  }

  if (!found) {
    const video = $('<video width="640" height="360" type="audio/mp4" controls preload></video>').attr('src', src);
    $remixer.find('>header').append(video);
  }

  $remixer.find('article').append(section);
});


// modals

$('#browse').click(() => {
  $('#browser').addClass('is-active');
});

$('#browser .modal-close').click(() => {
  $('#browser').removeClass('is-active');
});

$('#export').click(() => {
  $('#exporter').addClass('is-active');
});

$('#exporter .modal-close').click(() => {
  $('#exporter').removeClass('is-active');
});

// debug
window.debug = debug;
window.$ = $;
window.rangy = rangy;
