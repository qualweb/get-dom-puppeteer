'use strict';

import puppeteer, { Viewport } from 'puppeteer';
import htmlparser, { DomElement } from 'htmlparser2';
import request from 'request';

import { DomOptions } from '@qualweb/get-dom-puppeteer';

/**
 * PAGE USER AGENT
 */
const DEFAULT_DESKTOP_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:22.0) Gecko/20100101 Firefox/22.0';
const DEFAULT_MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 GLOBAL Build/S273) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';

/**
 * Page VIEWPORT size
 */
const DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH = 1920;
const DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT = 1080;

const DEFAULT_MOBILE_PAGE_VIEWPORT_WIDTH = 1920;
const DEFAULT_MOBILE_PAGE_VIEWPORT_HEIGHT = 1080;

function get_request_data(headers: (request.UrlOptions & request.CoreOptions)) {
  return new Promise((resolve: any, reject: any) => {
    request(headers, (error: any, response: request.Response, body: string) => {
      if (error) {
        reject(error);
      } else if (!response || response.statusCode !== 200) {
        reject(response.statusCode);
      } else {
        resolve({ response, body });
      }
    });
  });
}

async function getDom(url: string, options?: DomOptions): Promise <any> {

  let sourceHTML: string;
  let processedHTML: string;
  let parsedSourceHTML: DomElement[] | null = null;
  let parsedProcessedHTML: DomElement[] | null = null;

  const headers = {
    'url': url,
    'headers': {
      'User-Agent': options ? options.userAgent ? options.userAgent : options.mobile ? DEFAULT_MOBILE_USER_AGENT : DEFAULT_DESKTOP_USER_AGENT : DEFAULT_DESKTOP_USER_AGENT
    }
  };

  let data: any = await get_request_data(headers);

  sourceHTML = data.body.toString().trim();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  if (options) {
    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);    
    } else if (options.mobile) {
      await page.setUserAgent(DEFAULT_MOBILE_USER_AGENT);
    } else {
      await page.setUserAgent(DEFAULT_DESKTOP_USER_AGENT);
    }

    const viewPort: Viewport = {
      width: options.mobile ? DEFAULT_MOBILE_PAGE_VIEWPORT_WIDTH : DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH,
      height: options.mobile ? DEFAULT_MOBILE_PAGE_VIEWPORT_HEIGHT : DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT
    };
    if (options.resolution) {
      if (options.resolution.width) {
        viewPort.width = options.resolution.width;
      }
      if (options.resolution.height) {
        viewPort.height = options.resolution.height;
      }
    }
    viewPort.isMobile = options.mobile || false;
    viewPort.isLandscape = options.landscape || false;
    viewPort.hasTouch = options.mobile || false;

    await page.setViewport(viewPort);
  } else {
    await page.setViewport({
      width: DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH,
      height: DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    });
  }

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  processedHTML = await page.evaluate((computedStyle, elementsPosition) => {
    function getStyles(element: any) {
      if (element) {
        if (computedStyle) {
          element.setAttribute('computed-style', getComputedStyle(element).cssText);
        }

        if (elementsPosition) {
          var bounds = element.getBoundingClientRect();

          element.setAttribute('w-scrollx', window.scrollX);
          element.setAttribute('w-scrolly', window.scrollY);
          element.setAttribute('b-right', bounds.right);
          element.setAttribute('b-bottom', bounds.bottom);
        }

        if (element.hasChildNodes()) {
          for (var i = 0; i < element.childNodes.length; i++) {
            if (element.childNodes[i].nodeType === 1) {
              getStyles(element.childNodes[i]);
            }
          }
        }
      }
    }

    if (computedStyle || elementsPosition) {
      getStyles(document.activeElement);
    }

    return document.documentElement.outerHTML;
  }, options ? options.computedStyle || null : null, options ? options.elementsPosition || null : null);

  await browser.close();

  const handler = new htmlparser.DomHandler((error, dom) => {
    if (error) {
      throw new Error(error);
    } else {
      parsedProcessedHTML = dom;
    }
  });

  const parser = new htmlparser.Parser(handler);
  parser.write(processedHTML.replace(/(\r\n|\n|\r|\t)/gm, ''));
  parser.end();

  const handler2 = new htmlparser.DomHandler((error, dom) => {
    if (error) {
      throw new Error(error);
    } else {
      parsedSourceHTML = dom;
    }
  });

  const parser2 = new htmlparser.Parser(handler2);
  parser2.write(sourceHTML.replace(/(\r\n|\n|\r|\t)/gm, ''));
  parser2.end();

  return {
    sourceHTML,
    processedHTML,
    parsedSourceHTML,
    parsedProcessedHTML
  };
}

export {
  getDom
};