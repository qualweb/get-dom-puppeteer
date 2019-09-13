'use strict';

import puppeteer, { Viewport } from 'puppeteer';
import { Parser, DomElement, DomHandler, DomUtils } from 'htmlparser2';
import request from 'request';
const stew = new(require('stew-select')).Stew();
import css from 'css';
import clone from 'lodash/clone';

import { DomOptions, Dom, Html, CSSStylesheet } from '@qualweb/get-dom-puppeteer';

/**
 * PAGE USER AGENT
 */
const DEFAULT_DESKTOP_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:22.0) Gecko/20100101 Firefox/22.0';
const DEFAULT_MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 GLOBAL Build/S273) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';

/**
 * Page VIEWPORT size
 */
const DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH = 1366;
const DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT = 768;

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

async function getSourceHTML(url: string, options?: DomOptions): Promise<Html> {
  const headers = {
    'url': url,
    'headers': {
      'User-Agent': options ? options.userAgent ? options.userAgent : options.mobile ? DEFAULT_MOBILE_USER_AGENT : DEFAULT_DESKTOP_USER_AGENT : DEFAULT_DESKTOP_USER_AGENT
    }
  };

  const data: any = await get_request_data(headers);
  const sourceHTML: string = data.body.toString().trim();

  const parsedHTML = parseHTML(sourceHTML);
  const elements = stew.select(parsedHTML, '*');

  let title = '';

  const titleElement = stew.select(parsedHTML, 'title');

  if (titleElement.length > 0) {
    title = DomUtils.getText(titleElement[0]);
  }

  const source: Html = {
    html: {
      plain: sourceHTML,
      parsed: parsedHTML
    },
    elementCount: elements.length,
    title: title !== '' ? title : undefined
  }

  return source;
}

async function getProcessedHTML(url: string, options?: DomOptions): Promise<any> {
  
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
  const result = {};
  page.on('response',async response => {
    if(response.request().resourceType() === 'stylesheet') {
      // console.warn(await response);
      let url = await response.url();
      let content = await response.text();
      result[url] = content;
    }
  });

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  const processedHTML = await page.evaluate((computedStyle, elementsPosition, generateIds) => {
    
    var id = 1;

    function processData(element) {
      if (element) {
        if (generateIds && !element.getAttribute('id')) {
          element.setAttribute('id', 'qw-generated-id-' + id);
          id++;
        }

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
              processData(element.childNodes[i]);
            }
          }
        }
      }
    }

    if (computedStyle || elementsPosition || generateIds) {
      processData(document.activeElement);
    }

    return document.documentElement.outerHTML;
  }, 
    options ? options.computedStyle || false : false, 
    options ? options.elementsPosition || false : false,
    options ? options.generateIds || false : false);

  await browser.close();

  const parsedHTML = parseHTML(processedHTML);

  const elements = stew.select(parsedHTML, '*');

  let title = '';

  const titleElement = stew.select(parsedHTML, 'title');

  if (titleElement.length > 0) {
    title = DomUtils.getText(titleElement[0]);
  }

  const processed: Html = {
    html: {
      plain: processedHTML,
      parsed: parsedHTML
    },
    elementCount: elements.length,
    title: title !== '' ? title : undefined
  }

  return {processed, result};
}

function parseHTML(html: string): DomElement[] {
  let parsed: DomElement[] | undefined = undefined;

  const handler = new DomHandler((error, dom) => {
    if (error) {
      throw error;
    } else {
      parsed = dom;
    }
  });

  const parser = new Parser(handler);
  parser.write(html.replace(/(\r\n|\n|\r|\t)/gm, ''));
  parser.end();

  if (!parsed) {
    throw new Error('Failed to parse html');
  }

  return parsed;
}

async function parseStylesheets(files: any): Promise<CSSStylesheet[]> {
  
  let result: CSSStylesheet[] = new Array<CSSStylesheet>();

  for (const file in files){
    const stylesheet: CSSStylesheet = {file, content: {}};
    if (stylesheet.content) {
      stylesheet.content.plain = files[file];
      stylesheet.content.parsed = css.parse(files[file], {'silent':true}); //don't throw errors
      result.push(clone(stylesheet));
    }
  }
  
  return result;
}

async function getDom(url: string, options?: DomOptions): Promise<Dom> {
  
  const source: Html = await getSourceHTML(url, options);
  const { processed, result } = await getProcessedHTML(url, options);
  const stylesheets: CSSStylesheet[] = await parseStylesheets(result);
  
  return {
    source,
    processed,
    stylesheets
  };
}

export {
  getDom
};