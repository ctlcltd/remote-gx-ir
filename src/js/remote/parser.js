/**
 * remote-gx-ir/src/js/remote/parser.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';
import { xmlToJson } from '../vendor/xmlToJson.js';

remote.prototype.parser = function(xml) {
  const parser = new DOMParser();
  const docXml = parser.parseFromString(xml, 'text/xml');

  return xmlToJson(docXml);
}

export { remote };
