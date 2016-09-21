import debug from 'debug';
import $ from 'jquery';
import rangy from 'rangy';
import Tether from 'tether';

const d = debug('ha');

rangy.init();

const $player = $('#player');

$player.find('article').mouseup(() => {
  const selection = rangy.getSelection();
  d(selection.toHtml());

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
  d(selection.toHtml());

  if (range.canSurroundContents()) {
    d(selection.anchorNode);

    const mask = $('<div class="mask" draggable="true"></div>').html(selection.toHtml());
    mask.width($(anchor).width());
    // mask.height($(anchor).height());
    mask.appendTo($player.find('article section'));
    mask.on('dragstart', (e) => {
      d(e);
      e.originalEvent.dataTransfer.setData('html', selection.toHtml());
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
    });

    new Tether({
      element: mask,
      target: anchor,
      attachment: 'top left',
      targetAttachment: 'top left',
    });
  }
});


const $remixer = $('#remixer');

$remixer.find('article')
.on('dragover', (e) => {
  e.preventDefault();
})
.on('drop', (e) => {
  e.preventDefault();
  const html = e.originalEvent.dataTransfer.getData('html');
  d(html);
  $(e.target).append(html);
});


// debug
window.debug = debug;
window.$ = $;
window.rangy = rangy;
