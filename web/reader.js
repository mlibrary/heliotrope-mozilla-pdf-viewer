
// -- if we needed to extend the Navigator, we'd start here.
var PDFNavigator = cozy.Control.Navigator.extend({

  // _initializeNavigator: function(locations) {
  //   this._initiated = true;
  //   this._total = locations.total;
  //   this._last_value = this._control.value;
  //   this._spanTotalLocations.innerHTML = this._total;
  //   this._update();
  //   setTimeout(function() {
  //     this._container.classList.add('initialized');
  //   }.bind(this), 0);
  // },

  EOT: true
});

var PDFSearch = cozy.Control.Search.extend({

  onAdd: function(reader) {
    var self = this;
    console.log("AHOY AHOY", this);
    this._reader.on('ready', function() {
      // updatefindcontrolstate -- emites state=FOUND before all the results are found
      this._reader.PDFViewerApplication.eventBus.on('updatefindmatchescount', this._waitForResults.bind(this));
      this._reader.PDFViewerApplication.eventBus.on('updatefindcontrolstate', this._waitForQuery.bind(this));
    }.bind(this));

    return cozy.Control.Search.prototype.onAdd.apply(this, arguments);
  },

  submitQuery: function() {
    this._doWaitForResults = false;
    this._reader.PDFViewerApplication.findController.executeCommand('find', { source: this._reader, type: 'find', query: this.searchString, phraseSearch: true, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: null })
  },

  _waitForQuery: function(argv) {
    // if ( this.queryTimer ) { clearTimeout(this.queryTimer); }
    if ( argv.state == 0 || argv.state == 2 ) {
      // the query is done, so we can start computing the results
      this._doWaitForResults = true;
    } else if ( argv.state == 1 ) {
      this._data = { highlight_off: "yes", search_results: [] };
      this._buildResults();
    }
    console.log("AHOY updatefindcontrolstate", argv);
  },

  _waitForResults: function(argv) {
    if ( ! this._doWaitForResults ) { return; }
    if ( this.searchTimer ) { clearTimeout(this.searchTimer); }
    this.searchTimer = setTimeout(this._gatherResults.bind(this), 500);
    console.log("AHOY updatefindmatchescount", argv.matchesCount.total);
  },

  _gatherResults: function() {
    var self = this;

    this._data = { search_results: [], highlight_off: 'yes' };
    var pdfViewer = this._reader.pdfViewer;
    var findController = this._reader.PDFViewerApplication.findController;

    for(var i = 0; i < pdfViewer.pagesCount; i++) {
      var matches = findController._pageMatches[i];
      if ( ! matches ) { continue ; }
      var text = findController._pageContents[i];
      matches.forEach(function(match, index) {
        var snippet = self._getMatch(text, self.searchString, match);
        // self._data.search_results.push({ page: i, matchIdx: match, snippet: snippet });
        self._data.search_results.push({ cfi: i + 1, matchIdx: match, snippet: snippet });
      })
    }

    this._buildResults();
  },

  _getMatch: function(string, term, index) {
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
  },

  EOT: true

})

var PDFContents = cozy.Control.Contents.extend({
  _bindEvents: function() {
    var self = this;

    this._control.setAttribute('id', 'sidebarToggle');
    var template = 
      '<div id="toolbarSidebar">' +
        '<div class="splitToolbarButton toggled">' +
          '<button id="viewThumbnail" class="toolbarButton toggled" title="Show Thumbnails" tabindex="2" data-l10n-id="thumbs">' +
             '<span data-l10n-id="thumbs_label">Thumbnails</span>' +
          '</button>' +
          '<button id="viewOutline" class="toolbarButton" title="Show Document Outline (double-click to expand/collapse all items)" tabindex="3" data-l10n-id="document_outline">' +
             '<span data-l10n-id="document_outline_label">Document Outline</span>' +
          '</button>' +
          '<button id="viewAttachments" class="toolbarButton" title="Show Attachments" tabindex="4" data-l10n-id="attachments">' +
             '<span data-l10n-id="attachments_label">Attachments</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div id="sidebarContent">' +
        '<div id="thumbnailView">' +
        '</div>' +
        '<div id="outlineView" class="hidden">' +
        '</div>' +
        '<div id="attachmentsView" class="hidden">' +
        '</div>' +
      '</div>';

    this._modal = this._reader.modal({
      template: template,
      title: 'Contents',
      region: 'left',
      className: 'cozy-modal-contents',
      callbacks: {
        onShow: function() {
          self._pdfSidebar.open()
        },
        onClose: function() {
          self._pdfSidebar.close()
        }
      }
    });

    this._modal._container.querySelector('.modal__content').setAttribute('id', 'sidebarContainer');

    this._reader.on('updateContents', function(data) {

      this._pdfSidebar = this._reader.PDFViewerApplication.pdfSidebar;

      $(this._control).on('click', function(event) {
        self._reader.tracking.action('contents/open');
        self._modal.activate();
      })

      this._pdfSidebar.eventBus.on('pagechanging', function(evt) {
        if ( this._pdfSidebar.isOpen ) {
          this._modal.closeModal();
        }
      }.bind(this))

    }.bind(this));
  }
});

var PDFReader = cozy.Reader.extend({

  open: function(target, cb) {
    var self = this;
    if ( cb == null ) { cb = function() {}; }

    this._panes['epub'].setAttribute('id', 'viewerContainer');
    $(this._panes['epub']).append('<div id="viewer" class="pdfViewer"></div>');

    this.annotations = {
      reset: function() { /* NOP */ }
    }

    $.getScript("viewer.js", function() {
      self.PDFViewerApplication = window.PDFViewerApplication;

      self.PDFViewerApplication.open(self.options.href).then(function() {

        // reset the zoom to "auto"
        self.PDFViewerApplication.zoomReset();

        self.pdfViewer = this.PDFViewerApplication.pdfViewer;
        var setupInterval = setInterval(function() {
          if ( self.PDFViewerApplication.pdfDocument != null ) {
            clearInterval(setupInterval);

            // add events to viewer
            self.PDFViewerApplication.eventBus.on('pagechanging', function(evt) {
              var pageNumber = evt.pageNumber;
              self.fire('relocated', { start: pageNumber });
            });

            self.PDFViewerApplication.pdfDocument.getMetadata().then(function(data) {
              console.log("AHOY getMetadata", data);
              var metadata = {};
              if ( data.metadata ) {
                if ( data.metadata.has("dc:title") ) {
                  metadata.title = data.metadata.get("dc:title");
                }
                if ( data.metadata.has("dc:author") ) {
                  metadata.author = data.metadata.get("dc:author");
                }
              }
              self.metadata = metadata;

              self.fire("updateTitle", self.metadata);
              self.fire('updateContents', {});
              self.locations = { total: self.PDFViewerApplication.pagesCount };
              self.locations.locationFromCfi = function(pageNum) {
                return pageNum;
              }
              self.locations.percentageFromCfi = function(pageNum) {
                return ( pageNum / self.locations.total );
              }
              self.locations.cfiFromPercentage = function(percent) {
                var pageNum = Math.round(self.locations.total * percent);
                if ( pageNum < 1 ) { pageNum = 1; }
                if ( pageNum > this._total ) { pageNum = this._total; }
                return { start: pageNum };
              }

              self.fire('updateLocations',  self.locations);
              self.fire('relocated', self.currentLocation());
              self._disableBookLoader();
              cb();
            });

            self.fire("ready");
          } else {
            console.log("AHOY WAITING");
          }
        }, 100);
      });
    });
  },

  currentLocation: function() {
    return { start: { cfi: this.PDFViewerApplication.page } };
  },

  gotoPage: function(cfi) {
    if ( typeof(cfi) == "string" ) {
      cfi = { start: cfi.replace('epubcfi(', '').replace(')','') };
    }
    var pageNum = cfi.start;
    this.pdfViewer.currentPageLabel = pageNum;
  },

  EOT: true

});


var reader = new PDFReader('mainContainer', {
  href: location.search.replace('?file=', ''),
  download_links: []
});

// ----- add controls

// Close reader/Return to previous screen widget
cozy.control.widget.button({
  region: 'top.header.left',
  data: { label: '<i class="icon-x oi" data-glyph="x" aria-hidden="true"></i>'},
  template: '<button class="button--sm cozy-close" data-toggle="button" data-slot="label" aria-label="Close reader"></button>',
  onClick: function() { alert("Returning to monograph view."); }
}).addTo(reader);

cozy.control.widget.panel({
  region: 'top.header.left',
  template: '<div class="logo"><a href="https://fulcrum.org/michigan"><img src="../upload/press/logo_path/michigan/michigan.png" /></a></div>',
  data: { title: "Michigan" }
}).addTo(reader);


// Book/chapter title widget
cozy.control.title({ region: 'top.header.left' }).addTo(reader);

// Altmetric and Dimensions widgets
cozy.control.widget.panel({
  region: 'top.header.right',
  className: 'cozy-container-altmetric',
  template: '<div data-badge-popover="bottom" data-badge-type="1" data-isbn="978-3-598-21500-1" data-hide-no-mentions="true" class="altmetric-embed"></div>',
}).addTo(reader);


// Close reader/Return to previous screen widget
cozy.control.widget.button({
  region: 'top.toolbar.left',
  data: { label: '<i class="icon-x oi" data-glyph="x" aria-hidden="true"></i>'},
  template: '<button class="button--sm cozy-close mobile" data-toggle="button" data-slot="label" aria-label="Close reader"></button>',
  onClick: function() { alert("Returning to monograph view."); }
}).addTo(reader);


// Table of contents widget
var contents = new PDFContents({ region: 'top.toolbar.left', skipLink: '.skip' });
contents.addTo(reader);

cozy.control.widget.button({
  region: 'top.toolbar.left',
  template: '<button class="button--sm media" data-toggle="button" aria-label="Resources">Resources</button>',
  onClick: function() { window.location = "#"; }
}).addTo(reader);

cozy.control.widget.panel({
  region: 'top.toolbar.left',
  data: { title: window.location.href },
  template: '<div class="permalink-label"><label class="u-screenreader" for="permalink">Permalink</label><form><input data-slot="title" type="text" id="permalink" aria-label="citable link" value="" readonly="readonly" onclick="this.select(); document.execCommand(\'copy\');"></form></div>',
}).addTo(reader);

var my_citations = [
  {format: 'MLA', text: "Gere, Anne R. Developing Writers In Higher Education: A Longitudinal Study. Ann Arbor, MI: University of Michigan Press, 2019" },
  {format: 'APA', text: "Gere, A. (2019). Developing Writers in Higher Education: A Longitudinal Study. Ann Arbor, MI: University of Michigan Press." },
  {format: 'Chicago', text: "Gere, Anne R. 2019. Developing Writers In Higher Education: A Longitudinal Study. Ann Arbor, MI: University of Michigan Press." }
]
cozy.control.citation({ region: 'top.toolbar.left', citations: my_citations }).addTo(reader);

// cozy.control.widget.panel({
//   region: 'top.toolbar.left',
//   template: '<form class="search"><label class="u-screenreader" for="cozy-search-string">Search in this text</label><input id="cozy-search-string" name="search" type="text" placeholder="Search in this text..."><button class="button--sm" data-toggle="open" aria-label="Search"><i class="icon-magnifying-glass oi" data-glyph="magnifying-glass" title="Search" aria-hidden="true"></i></button></form>'
// }).addTo(reader);
var search = new PDFSearch({ region: 'top.toolbar.left' });
search.addTo(reader);
// cozy.control.search().addTo(reader);

cozy.control.download({
    region: 'top.toolbar.left',
    template: '<button class="button--sm cozy-download" data-toggle="open" aria-label="Download book" role="button"><i id="download" class="oi" data-glyph="data-transfer-download" title="Download book" aria-hidden="true"></i></button>',
}).addTo(reader);

cozy.control.widget.button({
  region: 'top.toolbar.right',
  className: 'cozy-container-fullscreen',
  template: '<button class="button--sm" data-toggle="button" data-slot="label" aria-label="Full screen"></button>',
  data: { label: '<i id="fullscreen" class="icon-fullscreen-enter oi" data-glyph="fullscreen-enter" title="Fullscreen Mode" aria-hidden="true"></i>' },
  onClick: function() {
    reader.requestFullscreen();
    if (!window.screenTop && !window.screenY) {
      $('#fullscreen').attr('data-glyph', 'fullscreen-enter');
    } else {
      $('#fullscreen').attr('data-glyph', 'fullscreen-exit');
    }
  }
}).addTo(reader);

cozy.control.widget.button({ region: 'top.toolbar.right', template: '<button class="cozy-control cozy-control-preferences" title="Preferences" role="button" aria-label="Preferences"><i class="icon-cog oi" data-glyph="cog" title="Preferences and Settings" aria-hidden="true"></i></button>' }).addTo(reader);

// Paging widgets
var action = cozy.control.pagePrevious({ region: 'left.sidebar' }).addTo(reader);
action._control.setAttribute('id', 'previous');
action = cozy.control.pageNext({ region: 'right.sidebar' }).addTo(reader);
action._control.setAttribute('id', 'next');

// Navigator widgets
cozy.control.navigator({ region: 'bottom.navigator' }).addTo(reader);

// start reader
reader.start();


console.log("YO HEY DER");