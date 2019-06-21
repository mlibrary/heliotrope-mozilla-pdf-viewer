var PATCH = {};

function getMatch(string, term, index)
{
    // index = string.indexOf(term)
    if(index >= 0)
    {
        var _ws = [" ","\t"]

        var whitespace = 0
        var rightLimit = 0
        var leftLimit = 0

        var whitespaceLimit = 8; // 4

        // right trim index
        for(rightLimit = index + term.length; whitespace < whitespaceLimit; rightLimit++)
        {
            if(rightLimit >= string.length){break}
            if(_ws.indexOf(string.charAt(rightLimit)) >= 0){whitespace += 1}
        }

        whitespace = 0
        // left trim index
        for(leftLimit = index; whitespace < whitespaceLimit; leftLimit--)
        {
            if(leftLimit < 0){break}
            if(_ws.indexOf(string.charAt(leftLimit)) >= 0){whitespace += 1}
        }
        return string.substr(leftLimit + 1, rightLimit - leftLimit - 1).replace(/([\.\;\,])(\w)/g, '$1 $2') // return match
    }
    return // return nothing
}

var setup_patches = function() {

  var init_search = false;

  var pdfViewer = PDFViewerApplication.pdfViewer;
  var $navigator = $("input[type=range]");

  // PDFViewerApplication.eventBus.on('pagenumberchanged', function(page) {
  //   console.log("AHOY EVENT", page);
  // })

  PDFViewerApplication.secondaryToolbar.__proto__.setPageNumber = function(page) {
    var pagesCount = pdfViewer.pagesCount;
    console.log("AHOY setPageNumber", page, pagesCount);
    var percentage = Math.ceil(( page / pagesCount ) * 100.0);
    $navigator.val(Math.floor(percentage));
    $('.currentPercentage').text(percentage + '%');
    $('.currentLocation').text(page);
    $('.totalLocations').text(pagesCount);
    var retro = -percentage;
    $(".cozy-navigator-range__background").css('background-position', retro + '% 0%, left top');

    if ( $("#outerContainer").is('.sidebarOpen') ) {
      PDFViewerApplication.pdfSidebar.close();
    }
  }

  $navigator.on('change', function(event) {
    var percentage = $navigator.val() / 100.0;
    var page = Math.floor(pdfViewer.pagesCount * percentage);
    if ( page <= 0 ) { page = 1 ; }
    if ( page > pdfViewer.pagesCount ){ page = pdfViewer.pagesCount; }
    pdfViewer.currentPageLabel = page;
  })

  $("body").on('click', '.modal__close', function(event) {
    event.preventDefault();
    var $modal = $(this).parents(".cozy-modal");
    if ( $modal.is(".cozy-modal-contents-container") ) {
      PDFViewerApplication.pdfSidebar.close();
    }
  })

  PATCH.searchTimer = null;
  var $resultsContainer = $("#resultsContainer");
  $resultsContainer.on('click', 'a', function(event) {
    event.preventDefault();
    var pageNumber = $(this).data('page-number');
    pdfViewer.currentPageLabel = pageNumber + 1;
    $resultsContainer.parents("[aria-hidden=false]").attr('aria-hidden', 'true');
  })

  var gatherResults = function() {
    if ( ! pdfViewer ) { pdfViewer = PDFViewerApplication.pdfViewer; }

    var results = [];

    // for(var i = 0; i < pdfViewer.pagesCount; i++) {
    //   var page = pdfViewer.getPageView(i);
    //   var matches = PDFViewerApplication.findController.pageMatches[i];
    //   var offsets = page.textLayer.convertMatches(matches, matches.length);
    //   offsets.forEach(function(offset, index) {
    //     var divIdx = offset.begin.divIdx;
    //     var textDiv = page.textLayer.textDivs[divIdx];
    //     console.log(textDiv);
    //   })
    // }

    for(var i = 0; i < pdfViewer.pagesCount; i++) {
      var matches = PDFViewerApplication.findController.pageMatches[i];
      var text = PDFViewerApplication.findController.pageContents[i];
      matches.forEach(function(match, index) {
        var snippet = getMatch(text, $input_search.val(), match);
        results.push({ page: i, matchIdx: match, snippet: snippet });
      })
    }

    $resultsContainer.empty();
    var $ul = $("<ul></ul>");
    results.forEach(function(result, index) {
      var $li = $("<li></li>");
      var $link = $("<a href='#'></a>");
      $link.data('page-number', result.page);
      $link.text(result.snippet);
      $li.append($link);
      $ul.append($li);
    })
    $resultsContainer.append($ul);
    $resultsContainer.parents("[aria-hidden=true]").attr('aria-hidden', 'false');


  }

  var $input_search = $("#cozy-search-string");
  $("button[aria-label='Search']").on('click', function(event) {
    event.preventDefault();

    if ( ! init_search ) {
      // PDFViewerApplication.externalServices.supportsIntegratedFind = true;
      // PDFViewerApplication.externalServices.updateFindControlState = function(data) {
      //   console.log("AHOY FIND MATCHES COUNT", data);
      // };

      PDFViewerApplication.findBar.__proto__.updateResultsCount = function(count) {
        if ( PATCH.searchTimer ) { clearTimeout(PATCH.searchTimer); }
        console.log("AHOY updateResultsCount", count);
        PATCH.searchTimer = setTimeout(gatherResults, 500);
      }


      init_search = true;
    }

    var searchterm = $.trim($input_search.val());
    if ( ! searchterm ) { return ; }
    PDFViewerApplication.findController.executeCommand('find', { source: PATCH, type: 'find', query: searchterm, phraseSearch: true, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: null })
  })

};

$(function() {
  var setupInterval = setInterval(function() {
    if ( window.PDFViewerApplication != undefined && window.PDFViewerApplication.secondaryToolbar != undefined ) {
      console.log("AHOY FOUND", window.PDFViewerApplication);
      setup_patches();
      clearInterval(setupInterval);
    } else {
      console.log("WAITING...");
    }
  }, 100);
})

