#!/usr/bin/env node

const issuePattern = /#(?<issue>[0-9]+)(.*\s-\s(?<comment>.*))?.*$/;

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
];

for (const description of descriptions) {
  const match = description[0].match(issuePattern);

  let pass = true;
  if (match && match.groups) {
    for (const field in description[1]) {
      if (match.groups[field].trim() !== description[1][field]) {
        pass = false;
        break;
      }
    }
  }
  console.log((pass ? 'PASS' : 'FAIL'), description[0], '-', match.groups.issue, '-', match.groups.comment);
}