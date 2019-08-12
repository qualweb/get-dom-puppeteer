const { getDom } = require('../dist/index');
const { expect } = require('chai');

const URL = 'http://accessible-serv.lasige.di.fc.ul.pt/~jvicente/test/';

describe('Source HTML', function() {
  describe('Element Count', function() {
    it('should exist', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(Object.keys(dom.source)).to.be.an('array').and.to.include('elementCount');
    });
    it(`shouldn't be 0`, async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(dom.source.elementCount).to.not.be.equal(0);
    });
  });
  describe('Title', function() {
    it('should exist', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(Object.keys(dom.source)).to.be.an('array').and.to.include('title');
    });
    it('should be "Hello World"', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(dom.source.title).to.be.equal('Hello World');
    });
  });
});

describe('Processed HTML', function() {
  describe('Element Count', function() {
    it('should exist', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(Object.keys(dom.processed)).to.be.an('array').and.to.include('elementCount');
    });
    it(`shouldn't be 0`, async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(dom.processed.elementCount).to.not.be.equal(0);
    });
  });

  describe('Title', function() {
    it('should exist', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(Object.keys(dom.processed)).to.be.an('array').and.to.include('title');
    });
    it('should be "Hello World"', async function() {
      this.timeout(10 * 1000);
      const dom = await getDom(URL);
      expect(dom.processed.title).to.be.equal('Hello World');
    });
  });
});