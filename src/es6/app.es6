import debug from 'debug';
import $ from 'jquery';
import rangy from 'rangy';
import Tether from 'tether';

const d = debug('ha');

rangy.init();

const $player = $('#player');
let tether;

$player.find('article').mouseup(() => {
  const selection = rangy.getSelection();

  const range = rangy.createRange();
  let anchor = selection.anchorNode.parentNode;
  // let anchor = selection.anchorNode.parentNode.parentNode;

  if (selection.anchorNode.parentNode.parentNode === selection.focusNode.parentNode.parentNode) {
    range.setStartBefore(selection.anchorNode.parentNode);
    range.setEndAfter(selection.focusNode.parentNode);
  } else {
    anchor = selection.anchorNode.parentNode.parentNode;
    range.setStartBefore(selection.anchorNode.parentNode.parentNode);
    range.setEndAfter(selection.focusNode.parentNode.parentNode);
  }
  selection.setSingleRange(range);

  if (range.canSurroundContents()) {
    const mask = $('<div class="mask" draggable="true"></div>').html(selection.toHtml());
    // const mask = $('<div class="mask" draggable="true"></div>').append($(anchor).clone());

    d(anchor.nodeName);
    if (anchor.nodeName === 'P') {
      mask.width($(anchor).width());
      mask.data('html', selection.toHtml());
      // d(selection.toHtml());
    } else {
      mask.data('html', `<p>${selection.toHtml()}</p>`);
      // d($(anchor.parentNode).clone().empty().append(selection.toHtml()).html());
    }

    mask.appendTo($player.find('article section'));
    mask.on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('html', mask.data('html'));
      e.originalEvent.dataTransfer.setData('src', $player.find('article section').data('src'));
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
    });

    if (tether) tether.destroy();
    $('.tether-element').remove();

    tether = new Tether({
      element: mask,
      target: anchor,
      attachment: 'top left',
      targetAttachment: 'top left',
    });

    selection.removeAllRanges();
  }
}).click((e) => {
  const m = $(e.target).data('m');
  if (!isNaN(m)) {
    $player.find('video')[0].currentTime = m / 1000;
  }
});

$player.find('video').on('timeupdate', (e) => {
  const time = $player.find('video')[0].currentTime * 1000;
  const words = $player.find('article span');
  for (let i = 0; i < words.length; i++) {
    if ($(words[i]).data('m') > time) {
      $(words[i]).addClass('head');
      $player.find('article span.head').not(words[i]).removeClass('head');
      break;
    }
  }
});

const $remixer = $('#remixer');

$remixer.find('article').on('dragover', (e) => {
  e.preventDefault();
}).on('drop', (e) => {
  e.preventDefault();

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
    const video = $('<video type="audio/mp4" controls></video>').attr('src', src);
    $remixer.find('>header').append(video);
  }

  // $(e.target).append(section);
  $remixer.find('article').append(section);
}).click((e) => {
  const m = $(e.target).data('m');
  if (!isNaN(m)) {
    const src = $(e.target).closest('section').data('src');
    const videoElements = $remixer.find('>header video');
    for (const video of videoElements) {
      if ($(video).attr('src') === src) {
        video.currentTime = m / 1000;
        break;
      }
    }
  }
});


// debug
window.debug = debug;
window.$ = $;
window.rangy = rangy;
