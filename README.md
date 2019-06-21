Hello, Conor! :-)

## Orientation

This repository is a scratch space for cusotmizing the Mozilla PDF Viewer to 
mimic the cozy-sun-bear reader. Eventually these files have to be organized to 
fit the `heliotrope` project structure.

`app_options.js` is the custom configuration for the viewer. Per Mozilla's 
instructions, in your clone of the `pdf.js` repository, you customize 
`web/app_options.js` and run `gulp generic`. So far, this custom configuration 
only disables defining a default PDF.

`gulp generic` creates `build/generic`; the `build` and `web` directories here are from
that directory.

`dist` is a local copy of `cozy-sun-bear/dist`. This is a pre-release build that 
has some small refactoring to make it possible to subclass the cozy-sun-bear components.

Finally, the files that make up "cozy-honey-bear":

* `web/reader.html`
* `web/reader.js`
* `web/cozy-honey-bear-reader.css`

## Viewing PDFs

You'll need a local webserver to best view the experiment:

http://localhost:2015/web/reader.html?file=9781407327457.pdf

You can compare your work with the standard Mozilla PDF Viewer with:

http://localhost:2015/web/viewer.html?file=9781407327457.pdf

[caddy](https://caddyserver.com/) does this simply with invoking `caddy browse` in the 
working directory.

## cozy-honey-bear

### reader.html

A static stand-in for the EPUB `show.html.erb` page, specifically the way that template
instantiates the `reader` object and then adds controls/widgets.

Note the `#mozilla-pdf-viewer-ui` div: the PDF Viewer binds to a **fully setup HTML structure**
and crashes if pieces are missing --- e.g. the password overlay that Fulcrum PDFs will 
never utilize. It's possible that `app_config.js` can be configured to eliminate these
checks, but hey, **shameless green.**

### reader.js

The assumption is that `reader.js` is being loaded directly to the browser, and not benefiting
from any npm/babel/webpack transforms.

Right now this mess of a file packs custom components *and* configuration of the page 
into one script, but these could obviously be split out for some less shameless time.

#### PDFReader

`PDFReader` extends the cozy-sun-bear base `Reader` class. The reader sets up the structures
that the viewer app exepcts, and then loads the `viewer.js` app (which starts running when loaded).

Once the PDF has loaded, the reader tries to assemble metadata from the PDF document
so the controls can render.

#### PDFContents

`PDFContents` extends the `Contents` control. This demonstrates how you can set up 
structures that the viewer app expects (e.g. its sidebar) within cozy-sun-bear structures.

### cozy-honey-bear-reader.css

Currently has bits from `heliotrope` (so the page would look okay), styles custom to 
the honey bear reader, and styles imported from `viewer.css`. You have to be careful about
the latter, as (of course) the approach to layout between cozy-sun-bear and the viewer
can be incompatible.


## Remnants of the first experiment

There was a first experiment that was more bog-standard jquery annotating a
clone of the rendered show page of the reader layout:

* `web/heliotrope.html`
* `web/patch.js`
* `web/cozy-honey-bear.css`

This is included because it implements some functionality that the "reader" version
doesn't, namely *search*.

It's built against the 1.x viewer, so some of the API needs to be adapted.


## Building pdf.js


