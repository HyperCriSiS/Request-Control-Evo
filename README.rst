|BuildStatus|

Request Control Evo - Firefox extension
---------------------------------------

An extension to control HTTP requests. Provides front-end for Firefox
`webRequest.onBeforeRequest`_ API for HTTP request management.

Request Control Evo keeps the Firefox ``webRequest`` engine as the reference
behavior and adds modern tooling around it:

-  Opt-in **Inspection Mode** for reloading a page and reviewing a bounded,
   local request snapshot without continuously recording normal browsing.
-  **Rule from request** actions and an optional guided rule assistant that
   create disabled drafts for review in the expert editor.
-  Exact **source-site scope** for Firefox rules, including direct editing in
   the expert editor. Unsupported MV3/DNR translations remain explicit rather
   than being broadened silently.
-  Structured community imports with descriptions, integrity hashes, optional
   GitHub reaction ratings, and a credential-less GitHub submission flow for
   explicitly selected local rules.
-  Light/dark theme support based on shared semantic color tokens.


Requests can be controlled with following rules:

-  **Filter Rule**

   Skip URL redirection and remove URL query parameters.

-  **Redirect Rule**

   Rewrite requests with support for `Pattern Capturing`_ to redirect based on the original request.

-  **Secure Rule**

   Upgrade non-secure (HTTP) requests to secure (HTTPS).

-  **Block Rule**

   Block requests before they are made.

-  **Whitelist Rule**

   Whitelist requests from other rules.

| `Manual`_
| `FAQ`_
| `Source code`_
| `License`_
| `Upstream`_

Support
~~~~~~~

-  Report bugs
-  Suggest new features
-  Help to translate
-  Contribute

Development
~~~~~~~~~~~

Clone repository and setup development environment with `npm`_

::

    git clone https://github.com/HyperCriSiS/Request-Control-Evo.git
    cd Request-Control-Evo
    npm install

Run in Firefox-nightly

::

    npm start -- --firefox=nightly

Run unit tests and lint

::

    npm test ; npm run lint

Build extension

::

    npm run build

External Libraries
~~~~~~~~~~~~~~~~~~

Request Control uses the following external libraries:

-  `lit`_ is licensed under the MIT license.
-  `tags-input`_ and its fork by `@pirxpilot`_ are licensed under the MIT license.
-  `ionicons`_ is licensed under the MIT license.
-  `tldts`_ is licensed under the MIT license.

License
~~~~~~~

::

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.

.. _webRequest.onBeforeRequest: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
.. _Pattern Capturing: https://github.com/HyperCriSiS/Request-Control-Evo/blob/master/_locales/en/manual.wiki#redirect-using-pattern-capturing
.. _Manual: https://github.com/HyperCriSiS/Request-Control-Evo/blob/master/_locales/en/manual.wiki
.. _FAQ: https://github.com/HyperCriSiS/Request-Control-Evo/issues?q=label%3Aquestion
.. _Source code: https://github.com/HyperCriSiS/Request-Control-Evo
.. _License: https://github.com/HyperCriSiS/Request-Control-Evo/blob/master/LICENSE
.. _Upstream: https://github.com/tumpio/requestcontrol
.. _npm: https://www.npmjs.com/
.. _lit: https://ajusa.github.io/lit/
.. _tags-input: https://github.com/developit/tags-input
.. _@pirxpilot: https://github.com/pirxpilot/tags-input
.. _ionicons: http://ionicons.com/
.. _tldts: https://github.com/remusao/tldts

.. |BuildStatus| image:: https://github.com/HyperCriSiS/Request-Control-Evo/actions/workflows/main.yml/badge.svg?branch=master
   :target: https://github.com/HyperCriSiS/Request-Control-Evo/actions
