/**
 * remote-gx-ir/src/js/_banner.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

const version = process.env.npm_package_version.replace(/(\d)\.(\d)\.(\d)/, '$1.$2');

export default () => 
`/*!
 * remote-gx-ir/script.js
 * 
 * @author Leonardo Laureti
 * @version ${version}
 * @license MIT License
 */`;
