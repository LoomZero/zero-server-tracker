#!/usr/bin/env node

const Color = require('zero-kit/src/cli/Color');
const App = require('../src/App');

const yes = Color.out('question', '✓');
const no = Color.out('error', '✗');

const app = new App();
app.debug = true;

const descriptions = [
  ['#12345', {issue: '12345'}],
  ['2342342 #12345', {issue: '12345'}],
  ['#12345 23432424', {issue: '12345'}],
  ['2131-123#12345', {issue: '12345'}],
  ['12121414 #12345 31341313', {issue: '12345'}],
  ['hallo - no #12345', {issue: '12345'}],
  ['#12345 - comment', {issue: '12345', comment: 'comment'}],
  ['#12345 - comment more  ', {issue: '12345', comment: 'comment more'}],
  ['test #12345 - comment', {issue: '12345', comment: 'comment'}],
  ['test #12345 - comment - real comment', {issue: '12345', comment: 'real comment'}],
  ['test #intern - comment - real comment', {issue: '12345', placeholder: 'intern', comment: 'real comment'}],
  ['test #daily - comment - real comment', {issue: '23456', placeholder: 'daily', comment: 'real comment'}],
  ['test #1234nothing - comment - real comment', null],
];

for (const description of descriptions) {
  const match = app.parseTrackingComment(description[0]);

  let pass = true;
  if (match && match.groups) {
    if (description[1] === null) {
      pass = false;
    } else {
      for (const field in description[1]) {
        if (match.groups[field].trim() !== description[1][field]) {
          pass = false;
          break;
        }
      }
    }
  } else if (description[1] !== null) {
    pass = false;
  }
  let matchdata = [];
  if (match && match.groups) {
    for (const field in match.groups) {
      matchdata.push(field.toUpperCase() + ': ' + match.groups[field]);
    }
  }
  console.log((pass ? yes : no), '(' + description[0] + ')', '|', matchdata.join(', '));
}