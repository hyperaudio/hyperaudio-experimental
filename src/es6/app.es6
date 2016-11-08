import debug from 'debug';
import $ from 'jquery';
import rangy from 'rangy';
import Tether from 'tether';
import Srt from 'srtjs';
import Nanobar from 'nanobar';

const d = debug('ha');

const TC = (time) => {
  return time;
  // const fps = 30;
  //
  // let frames = parseInt(Math.floor((time % 1000) * fps / 1000), 10);
  // let seconds = parseInt((time / 1000) % 60, 10);
  // let minutes = parseInt((time / (1000 * 60)) % 60, 10);
  // let hours = parseInt((time / (1000 * 60 * 60)) % 24, 10);
  //
  // hours = (hours < 10) ? `0${hours}` : hours;
  // minutes = (minutes < 10) ? `0${minutes}` : minutes;
  // seconds = (seconds < 10) ? `0${seconds}` : seconds;
  // frames = (frames < 10) ? `0${frames}` : frames;
  //
  // return `${hours}:${minutes}:${seconds}:${frames}`;
};

// PLAYER

const setHead = ($player, $video, time, classNames, skipHead) => {
  if (window.ignoreVideoEvents) return;

  const $sections = $player.find(`article > section[data-src="${$video.attr('src')}"]`);

  // let headExists = false;
  for (const section of $sections) {
    const $section = $(section);
    const words = $section.find('> p > span');

    const start = $(words[0]).data('m');
    const end = $(words[words.length - 1]).data('m') + $(words[words.length - 1]).data('d');

    if (time < start || time >= end) {
      if ($section.hasClass('active') && !$video.get(0).paused) {
        $video.get(0).pause();
        const next = $section.next('section');
        if (next.length > 0) {
          window.ignoreVideoEvents = true;
          $(next.find('span').get(0)).trigger('click');
          // $video.get(0).play();
          window.ignoreVideoEvents = false;
        }
        break;
      }

      $section.find('p.active').removeClass('active');
      continue;
    }
    // headExists = true;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const $word = $(word);
      const tc = $word.data('m');
      const duration = $word.data('d');

      if (time >= tc && time < tc + duration) {
        if (!$video.get(0).paused && $word.hasClass('head')) break;
        if (classNames) $word.addClass(classNames);

        if (!$video.get(0).paused && !$word.hasClass('duration')) {
          $word.addClass('duration');

          // sync on duration
          setTimeout(() => {
            $word.removeClass('duration');
            if (classNames) $word.removeClass(classNames);
            // sync
            // setHead($player, $video, $video.get(0).currentTime);
            // if (!$video.get(0).paused) {
            //   // jump to end
            //   setHead($player, $video, time + $word.data('d'), 'end', false);
            // }
          }, tc + duration - 1000 * $video.get(0).currentTime);
        }

        if (!$video.get(0).paused && !$word.hasClass('next')) {
          // find next
          if (i < words.length - 1) {
            setTimeout(() => {
              // jump to next
              if (!$video.get(0).paused) {
                setHead($player, $video, $(words[i + 1]).data('m'), 'next', true);
              }
              // sync
              if (!$video.get(0).paused) setHead($player, $video, 1000 * $video.get(0).currentTime, 'next', false);
            }, $(words[i + 1]).data('m') - 1000 * $video.get(0).currentTime);
          }
        }

        if (!skipHead) {
          $word.addClass('head').parent().addClass('active');
          $player.find('article span.head').not(word).each((h, head) => {
            if ($(head).data('m') !== $word.data('m')) $(head).removeClass('head');
          });

          $section.find('p.active').not($word.parent()).removeClass('active');

          // TODO scroll if available and only in active section
          // words[i].scrollIntoView({ block: 'end', behavior: 'smooth' });
        }

        break;
      }
    }
  }

  // if (!headExists && !$video.get(0).paused) {
  //   $video.get(0).pause();
  //
  //   // next section
  //   $($player.find('article section.active').next('section').find('span').get(0)).trigger('click');
  // }
};

const hookVideos = ($player) => {
  $player.find('video').each((v, video) => {
    const $video = $(video);

    if (! $video.hasClass('hyperaudio-enabled')) {
      $video.on('timeupdate', () => {
        const time = Math.floor(video.currentTime * 1000);
        $player.find('article').attr('data-current-time', TC(time));
        setHead($player, $video, time);
      }).addClass('hyperaudio-enabled');
    }
  });
};

$('.hyperaudio-player').each((p, player) => {
  const $player = $(player);

  // add titles
  $player.find('span[data-m]').each((s, span) => {
    const $span = $(span);
    $span.attr('title', `${TC($span.data('m'))} - ${TC($span.data('m') + $span.data('d'))}`);
  });

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
            $(video).show();
            video.currentTime = m / 1000;
            // break;
          } else {
            video.pause();
            $(video).hide();
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
        e.originalEvent.dataTransfer.setData('start', TC($(mask.find('span').get(0)).data('m')));
        e.originalEvent.dataTransfer.setData('end', TC($(mask.find('span').last().get(0)).data('m') + $(mask.find('span').last().get(0)).data('d')));
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

    const $target = $sink.find('.over');
    $target.removeClass('over');

    if (tether) tether.destroy();
    $('.tether-element').remove();

    const html = e.originalEvent.dataTransfer.getData('html');
    const src = e.originalEvent.dataTransfer.getData('src');
    if (!src || !html) return;

    const start = e.originalEvent.dataTransfer.getData('start');
    const end = e.originalEvent.dataTransfer.getData('end');

    const section = $(`<section draggable="true" data-src="${src}" data-start=${start} data-end=${end}></section>`);
    section.html(html);

    section.on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('html', html);
      e.originalEvent.dataTransfer.setData('src', src);
      e.originalEvent.dataTransfer.setData('start', start);
      e.originalEvent.dataTransfer.setData('end', end);
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.dropEffect = 'move';
    }).on('dragover', (e) => {
      e.preventDefault();
      return false;
    }).on('dragend', (e) => {
      section.remove();
      // TODO: remove video if no other segment references it
    });

    // TODO look for [src=""]?
    const videoElements = $sink.find('>header video');
    let found = false;
    for (const video of videoElements) {
      if ($(video).attr('src') === src) {
        $(video).show();
        found = true;
        // break;
      } else {
        video.pause();
        $(video).hide();
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

    if ($target.get(0).nodeName === 'ARTICLE') {
      $sink.find('article').append(section);
    } else {
      section.insertBefore($target);
    }
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


// load

const loadTranscript = (src, transcript, type) => {
  $('body').addClass('waiting');

  const $source = $('.hyperaudio-source');
  $source.find('video').remove();
  $source.find('section').remove();

  if (type === 'json') {
    const nanobar = new Nanobar({
      classname: 'nano',
      id: 'nano',
      target: $('main').get(0),
    });

    nanobar.go(50);

    $.get(transcript, (data) => {
      // console.log(data);
      const $section = $(`<section data-src="${src}" data-start="0" data-end="0"></section>`);

      let i = 0;
      for (const segment of data) {
        i++;
        nanobar.go(50 + (50 * i) / data.length);

        const p = $('<p></p>');
        for (const word of segment.words) {
          const s = $(`<span data-m="${Math.floor(word.start * 1000)}" data-d="${Math.floor((word.end - word.start) * 1000)}"></span>`);
          s.text(word.word + ' ');

          s.appendTo(p);
        }

        p.appendTo($section);
      }

      $section.attr('data-start', $section.find('span[data-m]').first().data('m'));
      $section.attr('data-end', $section.find('span[data-m]').last().data('m') + $section.find('span[data-m]').last().data('d'));

      $section.appendTo($source.find('article'));
      $('body').removeClass('waiting');
      $section.find('span[data-m]').first().trigger('click');
    }, 'json');
  } else if (type === 'srt') {
    const nanobar = new Nanobar({
      classname: 'nano',
      id: 'nano',
      target: $('main').get(0),
    });

    nanobar.go(50);

    $.get(transcript, (srt) => {
      const data = new Srt(srt);
      // console.log(typeof data, data);

      const $section = $(`<section data-src="${src}" data-start="0" data-end="0"></section>`);

      let i = 0;
      for (const segment of data.lines) {
        i++;
        nanobar.go(50 + (50 * i) / data.lines.length);

        const p = $('<p></p>');

        segment.words = [];
        const words = segment.subtitle.split(' ');
        const start = ((segment.start.hours * 60 + segment.start.minutes) * 60 + segment.start.seconds) * 1000 + segment.start.milliseconds;
        const end = ((segment.end.hours * 60 + segment.end.minutes) * 60 + segment.end.seconds) * 1000 + segment.end.milliseconds;
        // const unit = Math.floor((end - start) / words.join('').length);
        const unit = Math.floor((end - start) / words.length);

        // let prevEnd = start;
        for (let i = 0; i < words.length; i++) {
          segment.words.push({
            word: words[i],
            // start: prevEnd,
            // end: prevEnd + (words[i].length * unit),
            start: start + i * unit,
            end: start + i * unit + unit,
          });
          // prevEnd = prevEnd + (words[i].length * unit);
        }


        for (const word of segment.words) {
          const s = $(`<span data-m="${Math.floor(word.start)}" data-d="${Math.floor(word.end - word.start)}"></span>`);
          s.text(word.word + ' ');

          s.appendTo(p);
        }

        p.appendTo($section);
      }

      $section.attr('data-start', $section.find('span[data-m]').first().data('m'));
      $section.attr('data-end', $section.find('span[data-m]').last().data('m') + $section.find('span[data-m]').last().data('d'));

      $section.appendTo($source.find('article'));
      $('body').removeClass('waiting');
      $section.find('span[data-m]').first().trigger('click');
    }, 'text');
  } else $('body').removeClass('waiting');
};


// MEH
$.get('data/transcripts.json', (transcripts) => {
  for (const transcript of transcripts) {
    const src = `https://s3.amazonaws.com/ingest.spintime.tv/${(transcript.startsWith('00/') ? 'itp-spintime-tv.s3.amazonaws.com/' : 'videogrep-allvideos/' ) + transcript.replace('.transcription.json', '').replace('00/', '')}`;

    const json = `data/bulk/${transcript.replace('00/', '')}`;
    const thumb = 'http://placehold.it/128x128'; //
    const title = transcript.replace('.transcription.json', '').replace('00/', '').replace(/_/g, ' ');
    const duration = '';
    const description = '(transcript)';

    const $entry = $(`<article class="media" data-src="${src}"
    data-transcript="${json}" data-type="json">
      <figure class="media-left">
        <p class="image is-4by3" style="width: 5em">
          <img src="${thumb}">
        </p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p>
            <strong class="link">${title}</strong> <small>${duration}</small>
            <br>${description}
          </p>
        </div>
      </div>
    </article>`);

    $entry.appendTo('#browser .box');
  }

  // hook
  $('#browser .link').click((e) => {
    $('body').addClass('waiting');
    loadTranscript($(e.target).closest('article').data('src'), $(e.target).closest('article').data('transcript'), $(e.target).closest('article').data('type'));
    $('#browser').removeClass('is-active');
  });
}, 'json');


$.get('data/captions.json', (captions) => {
  for (const transcript of captions) {
    const src = `https://s3.amazonaws.com/ingest.spintime.tv/itp-spintime-tv.s3.amazonaws.com/${transcript.replace('.srt', '.mp4').replace('00/', '')}`;

    const srt = `data/bulk/${transcript.replace('00/', '')}`;
    const thumb = 'http://placehold.it/128x128'; //  `http://media.spintime.tv.s3-website-us-east-1.amazonaws.com/${transcript.replace('.mp4.transcription.json', '')}_1.jpg`;
    const title = transcript.replace('.srt', '').replace('.x264-[2Maverick]', '').replace(/\./g, ' ');
    const duration = '';
    const description = '(captions)';

    const $entry = $(`<article class="media" data-src="${src}"
    data-transcript="${srt}" data-type="srt">
      <figure class="media-left">
        <p class="image is-4by3" style="width: 5em">
          <img src="${thumb}">
        </p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p>
            <strong class="link">${title}</strong> <small>${duration}</small>
            <br>${description}
          </p>
        </div>
      </div>
    </article>`);

    $entry.appendTo('#browser .box');
  }

  // hook
  $('#browser .link').click((e) => {
    $('body').addClass('waiting');
    loadTranscript($(e.target).closest('article').data('src'), $(e.target).closest('article').data('transcript'), $(e.target).closest('article').data('type'));
    $('#browser').removeClass('is-active');
  });
}, 'json');


// // EDL
// const assembleEDL = () => {
//
//   /* eslint-disable */
//   const edl = {
//     "template": "basic",
//     "thumbnail": "https://archive.org/pop/resources/icons/fb-logo.png",
//     "tags": [
//       "popcorn"
//     ],
//     "name": `Remix ${new Date()}`,
//     "description": "",
//     "media": [
//       {
//         "id": "Media0",
//         "name": "Media0",
//         "url": "#t=,7.668800767916412",
//         "target": "video",
//         "duration": 7.6688007679164,
//         "popcornOptions": {
//           "frameAnimation": true
//         },
//         "controls": true,
//         "tracks": [
//           {
//             "name": "",
//             "id": "0",
//             "order": 0,
//             "trackEvents": []
//           }
//         ],
//         "clipData": {},
//         "currentTime": 0
//       }
//     ],
//     "targets": [
//       {
//         "id": "Target0",
//         "name": "video-container",
//         "element": "video-container"
//       }
//     ]
//   };
//
//
//   const $sections = $('.hyperaudio-sink article section');
//
//   let i = -1;
//   let start = 0;
//   let end = 0;
//   for (const section of $sections) {
//     i++;
//     const src = $(section).data('src');
//     const from1 = $(section).data('start') / 1000;
//     const duration = $(section).data('end') / 1000;
//
//     end = start + duration;
//
//     const trackEvent = {
//       "id": "TrackEvent" + i,
//       "type": "sequencer",
//       "popcornOptions": {
//         "source": [ src ],
//         "fallback": "",
//         "denied": false,
//         "start": start,
//         "end": end,
//         "type": "Archive",
//         "thumbnailSrc": "https://archive.org/download/electricsheep-flock-244-80000-6/electricsheep-flock-244-80000-6.thumbs/00244=80086=79910=77346_000001.jpg",
//         "from": from1,
//         "title": "Clip " + i,
//         "duration": duration,
//         "linkback": "https://s3.amazonaws.com/ingest.spintime.tv/",
//         "contentType": "",
//         "hidden": false,
//         "target": "video-container",
//         "width": 100,
//         "height": 100,
//         "top": 0,
//         "left": 0,
//         "volume": 100,
//         "mute": false,
//         "zindex": 1000,
//         "id": "TrackEvent" + i
//       },
//       "track": "0",
//       "name": "TrackEvent" + i
//     };
//
//     start = end;
//
//     edl.media[0].tracks[0].trackEvents.push(trackEvent);
//
//     const clip = {
//       "source": src,
//       "type": "Archive",
//       "title": "Clip " + i,
//       "thumbnail": "https://archive.org/download/electricsheep-flock-244-80000-6/electricsheep-flock-244-80000-6.thumbs/00244=80086=79910=77346_000001.jpg",
//       "linkback": "https://s3.amazonaws.com/ingest.spintime.tv/",
//       "duration": duration
//     };
//
//     edl.media[0].clipData[src] = clip;
//   }
//
//   return edl;
// };

// LINK
const assembleLink = () => {
  // const base = 'http://cibo.local:5757/PopcornEditor/editor.html?base=http://54.172.192.184/&initialMedia=';
  const base = 'https://gridinoc.com/popcorn/popcorn-editor/PopcornEditor/editor.html?base=https://gridinoc.com/popcorn/&initialMedia=';
  const segments = [];

  const $sections = $('.hyperaudio-sink article section');

  for (const section of $sections) {
    const src = $(section).data('src').replace('https://s3.amazonaws.com/ingest.spintime.tv/', '');
    let start = $(section).data('start') / 1000;
    let end = $(section).data('end') / 1000;

    // give trim space
    if (start > 5) start = start - 5;
    end = end + 5;

    // segments.push(encodeURIComponent(`${src}#/t=${start}/${end}`));
    segments.push(encodeURIComponent(`${src}?start=${start}&end=${end}`));
  }

  return `${base}${segments.join(',')}`;
};

$('#popcorn').click(() => {
  const link = assembleLink();
  window.open(link);
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
window.loadTranscript = loadTranscript;
window.assembleLink = assembleLink;
