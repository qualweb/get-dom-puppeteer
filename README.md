# QualWeb Puppeteer Module

[Puppeteer](https://github.com/GoogleChrome/puppeteer) module for QualWeb.

## How to install

```shell
  $ npm i @qualweb/get-dom-puppeteer --save
```

## How to run

```javascript
  'use strict';

  const { getDom } = require('@qualweb/get-dom-puppeteer');

  (async () => {
    const dom = await getDom('https://act-rules.github.io/pages/about/');

    console.log(dom.sourceHTML); // html before javascript processing
    console.log(dom.parsedSourceHTML); // source html parsed by 'htmlparser2' (https://github.com/fb55/htmlparser2)
    console.log(dom.processedHTML); // html after javascript processing
    console.log(dom.parsedProcessedHTML); // processed html parsed by 'htmlparser2' (https://github.com/fb55/htmlparser2)
  })();
```

## Configure

```javascript
  'use strict';

  const { getDom } = require('@qualweb/get-dom-puppeteer');

  (async () => {
    const options = {
      mobile: true, // default false
      landscape: true, // default false
      userAgent: 'your custom user agent',
      resolution: {
        width: 1440, // default 1920
        height: 720 // default 1080
      },
      computedStyle: false, // default true - adds the computed style to each element in a custom attribute [computed-style]
      elementsPosition: false // default true - adds the element position in relation to the viewport and scroll, attributes [w-scrollx, w-scrolly, b-right, b-bottom]
    };

    const dom = await getDom('https://act-rules.github.io/pages/about/', options);
  })();
```

# License

ISC