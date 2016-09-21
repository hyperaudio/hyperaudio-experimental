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
    if (anchor.nodeName === 'P') mask.width($(anchor).width());

    mask.data('html', selection.toHtml());
    mask.appendTo($player.find('article section'));
    mask.on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('html', mask.data('html'));
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
});


const $remixer = $('#remixer');

$remixer.find('article').on('dragover', (e) => {
  e.preventDefault();
}).on('drop', (e) => {
  e.preventDefault();

  const html = e.originalEvent.dataTransfer.getData('html');
  const section = $('<section></section>');
  section.html(html);

  // $(e.target).append(section);
  $remixer.find('article').append(section);
});


// debug
window.debug = debug;
window.$ = $;
window.rangy = rangy;
