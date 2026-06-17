// Adapted from code by Matt Walters https://www.mattwalters.net/posts/2018-03-28-hugo-and-lunr/

(function ($) {
  'use strict';

  // Replace consecutive CJK characters with bigrams so Lunr.js can tokenize them.
  // e.g. "改密码" → "改密 密码", "修改密码" → "修改 改密 密码"
  const cjkBigrams = (text) =>
    String(text).replace(/([^\x00-\x7F]+)/g, (match) => {
      if (match.length === 1) return match;
      const bg = [];
      for (let i = 0; i < match.length - 1; i++) {
        bg.push(match.slice(i, i + 2));
      }
      return bg.join(' ');
    });

  $(document).ready(function () {
    const $searchInput = $('.td-search input');

    $searchInput.on('change', (event) => {
      render($(event.target));
      $searchInput.blur();
    });

    $searchInput.closest('form').on('submit', () => false);

    let idx = null;
    const resultDetails = new Map();

    $.ajax($searchInput.data('offline-search-index-json-src')).then((data) => {
      idx = lunr(function () {
        this.pipeline.remove(lunr.trimmer);
        this.searchPipeline.remove(lunr.trimmer);

        this.ref('ref');
        this.field('title', { boost: 5 });
        this.field('categories', { boost: 3 });
        this.field('tags', { boost: 3 });
        this.field('description', { boost: 2 });
        this.field('body');

        data.forEach((doc) => {
          this.add({
            ref:         doc.ref,
            title:       cjkBigrams(doc.title),
            categories:  cjkBigrams(doc.categories),
            tags:        cjkBigrams(doc.tags),
            description: cjkBigrams(doc.description),
            body:        cjkBigrams(doc.body),
          });

          resultDetails.set(doc.ref, {
            title:  doc.title,
            excerpt: doc.excerpt,
          });
        });
      });

      $searchInput.trigger('change');
    });

    const render = ($targetSearchInput) => {
      {
        const popover = bootstrap.Popover.getInstance($targetSearchInput[0]);
        if (popover !== null) popover.dispose();
      }

      if (idx === null) return;

      const rawQuery = $targetSearchInput.val();
      if (rawQuery === '') return;

      // Convert query to bigrams and require ALL tokens to match (AND logic)
      const searchQuery = cjkBigrams(rawQuery);
      const results = idx
        .query((q) => {
          lunr.tokenizer(searchQuery.toLowerCase()).forEach((token) => {
            q.term(token.toString(), {
              boost: 100,
              presence: lunr.Query.presence.REQUIRED,
            });
            q.term(token.toString(), {
              wildcard: lunr.Query.wildcard.TRAILING,
              boost: 10,
              presence: lunr.Query.presence.OPTIONAL,
            });
          });
        })
        .slice(0, $targetSearchInput.data('offline-search-max-results'));

      const $html = $('<div>');
      $html.append(
        $('<div>')
          .css({ display: 'flex', justifyContent: 'space-between', marginBottom: '1em' })
          .append($('<span>').text('搜索结果').css({ fontWeight: 'bold' }))
          .append($('<span>').addClass('td-offline-search-results__close-button'))
      );

      const $searchResultBody = $('<div>').css({
        maxHeight: `calc(100vh - ${
          $targetSearchInput.offset().top - $(window).scrollTop() + 180
        }px)`,
        overflowY: 'auto',
      });
      $html.append($searchResultBody);

      if (results.length === 0) {
        $searchResultBody.append($('<p>').text(`未找到与"${rawQuery}"相关的结果`));
      } else {
        results.forEach((r) => {
          const doc  = resultDetails.get(r.ref);
          const href = $searchInput.data('offline-search-base-href') + r.ref.replace(/^\//, '');

          const $entry = $('<div>').addClass('mt-4');
          $entry.append($('<small>').addClass('d-block text-body-secondary').text(decodeURIComponent(r.ref)));
          $entry.append(
            $('<a>').addClass('d-block').css({ fontSize: '1.2rem' }).attr('href', href).text(doc.title)
          );
          $entry.append($('<p>').text(doc.excerpt));
          $searchResultBody.append($entry);
        });
      }

      $targetSearchInput.one('shown.bs.popover', () => {
        $('.td-offline-search-results__close-button').on('click', () => {
          $targetSearchInput.val('');
          $targetSearchInput.trigger('change');
        });
      });

      new bootstrap.Popover($targetSearchInput, {
        content:     $html[0],
        html:        true,
        customClass: 'td-offline-search-results',
        placement:   'bottom',
      }).show();
    };
  });
})(jQuery);
