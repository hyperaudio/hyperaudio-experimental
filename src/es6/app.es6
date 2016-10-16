import debug from 'debug';
import $ from 'jquery';
import rangy from 'rangy';
import Tether from 'tether';
import Tooltip from 'tether-tooltip';
import Drop from 'tether-drop';
// import Shepherd from 'tether-shepherd';

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
        // TODO consolidate video creation
        const video = $(`<video
          width="640" height="360"
          type="audio/mp4"
          src="${src}"
          controls preload></video>`);

        $player.find('.hyperaudio-media').append(video);
        videoElements = [video];
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
let tether;

$('.hyperaudio-source').each((s, source) => {
  const $source = $(source);

  // $source.find('article section').contents().each((n, node) => {
  //   if (node.nodeName !== 'P') $(node).remove();
  // });

  $source.find('article').mouseup(() => {
    const selection = rangy.getSelection();
    d(selection.anchorNode, selection.focusNode);

    const range = rangy.createRange();
    let anchor = selection.anchorNode.parentNode;
    let start = selection.anchorNode.parentNode;
    let end = selection.focusNode.parentNode;

    if (selection.focusNode.nodeName === 'P') end = selection.focusNode.previousElementSibling.lastElementChild;
    d(start, end);

    if (start.parentNode !== end.parentNode) {
      anchor = anchor.parentNode;
      start = start.parentNode;
      end = end.parentNode;
    }
    d(start, end);


    // if (end.nodeName === 'ARTICLE') start = end;

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
        e.originalEvent.dataTransfer.dropEffect = 'copy';
      });

      mask.mouseup(() => {
        if (tether) tether.destroy();
        $('.tether-element').remove();
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
});


$('.hyperaudio-sink').each((s, sink) => {
  const $sink = $(sink);

  $sink.find('article').on('dragover', (e) => {
    e.preventDefault();
    return false;
  }).on('drop', (e) => {
    e.preventDefault();
    $sink.find('.over').removeClass('over');


    if (tether) tether.destroy();
    $('.tether-element').remove();

    const html = e.originalEvent.dataTransfer.getData('html');
    const src = e.originalEvent.dataTransfer.getData('src');
    if (!src || !html) return;

    const section = $(`<section draggable="true" data-src=${src}></section>`);
    section.html(html);

    section.on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('html', html);
      e.originalEvent.dataTransfer.setData('src', src);
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.dropEffect = 'move';
    }).on('dragover', (e) => {
      e.preventDefault();
      return false;
    });

    // TODO look for [src=""]?
    const videoElements = $sink.find('>header video');
    let found = false;
    for (const video of videoElements) {
      if ($(video).attr('src') === src) {
        found = true;
        break;
      }
    }

    // TODO consolidate video creation
    if (!found) {
      const video = $(`<video
        width="640" height="360"
        type="audio/mp4"
        src="${src}"
        controls preload></video>`);

      $sink.find('>header').append(video);
    }

    $sink.find('article').append(section);
  }).on('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log(e.target);
    $sink.find('.over').removeClass('over');
    let target = $(e.target).closest('section[data-src]');
    if (target.length === 0) target = $(e.target);
    target.addClass('over');
  }).on('dragleave', (e) => {
    // $(e.target).closest('section[data-src]').removeClass('over');
  }).on('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }).on('dragend', (e) => {
    $sink.find('.over').removeClass('over');
  });
});

// drop

new Drop({
  target: document.querySelector('video'),
  content: 'TODO: video metadata',
  classes: 'drop-theme-arrows-bounce-dark',
  position: 'bottom center',
  openOn: 'click',
});

// modals

new Tooltip({
  target: $('#browse').get(0),
  content: 'Browse/search videos',
  classes: 'tooltip-theme-arrows',
  position: 'bottom left',
});

new Tooltip({
  target: $('#export').get(0),
  content: 'Export/share remix',
  classes: 'tooltip-theme-arrows',
  position: 'bottom right',
});

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

// tour

// const tour = new Shepherd.Tour({
//   defaults: {
//     classes: 'shepherd-theme-square-dark',
//   },
// });
//
// tour.addStep('example', {
//   title: 'Example Shepherd',
//   text: 'Creating a Shepherd is easy too! Just create ...',
//   attachTo: '#browse',
//   advanceOn: '.docs-link click',
// });

// tour.start();

// debug
window.debug = debug;
window.$ = $;
window.rangy = rangy;
