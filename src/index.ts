'use strict';

import puppeteer, { Viewport } from 'puppeteer';
import { Parser, DomElement, DomHandler, DomUtils } from 'htmlparser2';
import request from 'request';
const stew = new(require('stew-select')).Stew();
import css from 'css';
import clone from 'lodash/clone';
import { DomOptions, Dom, Html, CSSStylesheet } from '@qualweb/get-dom-puppeteer';
import {
  DEFAULT_DESKTOP_USER_AGENT,
  DEFAULT_MOBILE_USER_AGENT,
  DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH,
  DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT,
  DEFAULT_MOBILE_PAGE_VIEWPORT_WIDTH,
  DEFAULT_MOBILE_PAGE_VIEWPORT_HEIGHT
} from './constants';

function getRequestData(headers: (request.UrlOptions & request.CoreOptions)) {
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

  const data: any = await getRequestData(headers);
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
    viewPort.isMobile = !!options.mobile;
    viewPort.isLandscape = options.landscape !== undefined ? options.landscape : viewPort.width > viewPort.height;
    viewPort.hasTouch = !!options.mobile;

    await page.setViewport(viewPort);
  } else {
    await page.setViewport({
      width: DEFAULT_DESKTOP_PAGE_VIEWPORT_WIDTH,
      height: DEFAULT_DESKTOP_PAGE_VIEWPORT_HEIGHT,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    });
  }
  const plainStylesheets = {};
  page.on('response', async response => {
    if(response.request().resourceType() === 'stylesheet') {
      const url = response.url();
      const content = await response.text();
      plainStylesheets[url] = content;
    }
  });

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  const processedHTML = await page.evaluate((computedStyle, elementsPosition, generateIds) => {

    var id = 1;

    function processData(element) {

      if (element && element.name !== 'head') {
        if (generateIds && !element.getAttribute('id')) {
          element.setAttribute('id', 'qw-generated-id-' + id);
          id++;
        }

        if (element.name === 'video') {
          element.setAttribute('duration', element.duration);
        }

        if (computedStyle) {
          element.setAttribute('computed-style', getComputedStyle(element).cssText);
          element.setAttribute('computed-style-before', getComputedStyle(element, ':before').cssText);
          element.setAttribute('computed-style-after', getComputedStyle(element, ':after').cssText);
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

    var plainHTML = JSON.parse(JSON.stringify(document.documentElement.outerHTML));

    if (computedStyle || elementsPosition || generateIds) {
      var html = document.getElementsByTagName('html')[0];
      processData(html);

      var windowInnerHeight = window.innerHeight;
      var windowInnerWidth = window.innerWidth;
      var documentClientHeight = document.documentElement.clientHeight;
      var documentClientWidth = document.documentElement.clientWidth;

      if (html) {
        html.setAttribute('window-inner-height', windowInnerHeight.toString());
        html.setAttribute('window-inner-width', windowInnerWidth.toString());
        html.setAttribute('document-client-height', documentClientHeight.toString());
        html.setAttribute('document-client-width', documentClientWidth.toString());
      }
    }

    return { plainHTML, alteredHTML: document.documentElement.outerHTML };
  }, 
    options && options.computedStyle !== undefined ? options.computedStyle : true,
    options && options.elementsPosition !== undefined ? options.elementsPosition : true,
    options && options.generateIds !== undefined ? options.generateIds : true);

  await browser.close();

  const parsedHTML = parseHTML(processedHTML.alteredHTML);

  const elements = stew.select(parsedHTML, '*');

  let title = '';

  const titleElement = stew.select(parsedHTML, 'title');

  if (titleElement.length > 0) {
    title = DomUtils.getText(titleElement[0]);
  }

  const processed: Html = {
    html: {
      plain: processedHTML.plainHTML,
      parsed: parsedHTML
    },
    elementCount: elements.length,
    title: title !== '' ? title : undefined
  }

  //save the css that is in the HTML code
  let styles = stew.select(parsedHTML, 'style');
  for(let i = 0; i < styles.length; i++){
    plainStylesheets['html'+i] = styles[i]['children'][0]['data'];
  }

  return { processed, plainStylesheets };
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

async function parseStylesheets(plainStylesheets: any): Promise<CSSStylesheet[]> {
  const stylesheets: CSSStylesheet[] = new Array<CSSStylesheet>();

  for (const file in plainStylesheets || {}){
    const stylesheet: CSSStylesheet = {file, content: {}};
    if (stylesheet.content) {
      stylesheet.content.plain = plainStylesheets[file];
      stylesheet.content.parsed = css.parse(plainStylesheets[file], { silent: true }); //doesn't throw errors
      stylesheets.push(clone(stylesheet));
    }
  }

  return stylesheets;
}

async function mapCSSElements(dom: any, styleSheets: CSSStylesheet[]): Promise<any>{

  for (const styleSheet of styleSheets || []) {
    if(styleSheet.content && styleSheet.content.plain){
        analyseAST(dom, styleSheet.content.parsed);
    }
  }
  function analyseAST(dom: any, cssObject: any, parentType?: string): void {
    if (cssObject === undefined ||
      cssObject['type'] === 'comment' ||
      cssObject['type'] === 'keyframes' ||
      cssObject['type'] === 'import'){ // ignore
      return;
    }
    if (cssObject['type'] === 'rule' || cssObject['type'] === 'font-face' || cssObject['type'] === 'page') {
      loopDeclarations(dom, cssObject, parentType);
    } else {
      if (cssObject['type'] === 'stylesheet') {
        for (const key of cssObject['stylesheet']['rules'] || []) {
          analyseAST(dom, key);
        }
      } else {
        for (const key of cssObject['rules'] || []) {
          if(cssObject['type'] && cssObject['type'] === 'media')
            analyseAST(dom, key, cssObject[cssObject['type']]);
          else
            analyseAST(dom, key);
        }
      }
    }
  }
  function loopDeclarations(dom: any, cssObject: any, parentType?: string): void {
    let declarations = cssObject['declarations'];
    if(declarations && cssObject['selectors'] && !cssObject['selectors'].toString().includes('@-ms-viewport') && !(cssObject['selectors'].toString() === ":focus")){//stew crashes with this selectors | Note   The @-ms-viewport property is behind an experimental flag and turned off by default in Microsoft Edge.
      try{//don't crash the program if the css syntax is wrong
        let stewResult = stew.select(dom, cssObject['selectors'].toString());
        if(stewResult.length > 0){
          for(const item of stewResult || []){
            for (const declaration of declarations || []) {
              if (declaration['property'] && declaration['value'] ) {
                if(!item['attribs']['css'])
                  item['attribs']['css'] = {}
                if(item['attribs']['css'][declaration['property']] && item['attribs']['css'][declaration['property']]['value'] &&
                  item['attribs']['css'][declaration['property']]['value'].includes("!important")){
                  continue;
                }else{
                  item['attribs']['css'][declaration['property']] = {}
                  if(parentType){
                    item['attribs']['css'][declaration['property']]['media'] = parentType;
                  }
                  item['attribs']['css'][declaration['property']]['value'] = declaration['value'];
                }
              }
            }
          }
        }
      } catch(err){
        //console.warn(err)
      }
    }
  }
}

async function getDom(url: string, options?: DomOptions): Promise<Dom> {

  const source: Html = await getSourceHTML(url, options);
  const { processed, plainStylesheets } = await getProcessedHTML(url, options);
  const stylesheets: CSSStylesheet[] = await parseStylesheets(plainStylesheets);
  await mapCSSElements(processed.html.parsed, stylesheets);

  return {
    source,
    processed,
    stylesheets
  };
}

export {
  getDom
};