const { getDom } = require('../dist/index');
const { expect } = require('chai');

const URL = 'http://accessible-serv.lasige.di.fc.ul.pt/~jvicente/test/';

describe('Testing CSS', function() {
  it.only('should have css', async function() {
    this.timeout(10 * 1000);
    const { stylesheets } = await getDom(URL);;
    expect(stylesheets).to.not.be.undefined;
  });
});