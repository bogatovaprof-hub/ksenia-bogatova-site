import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(projectRoot, 'index.html');
const configPath = path.join(projectRoot, 'assets', 'js', 'config.js');
const errors = [];

if (!fs.existsSync(indexPath)) errors.push('Не найден index.html.');
if (!fs.existsSync(configPath)) errors.push('Не найден assets/js/config.js.');

let config = null;
if (fs.existsSync(configPath)) {
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(configPath, 'utf8'), sandbox, { timeout: 1000 });
    config = sandbox.window.SITE_CONFIG;
  } catch (error) {
    errors.push(`Не удалось прочитать SITE_CONFIG: ${error.message}`);
  }
}

const isPlaceholder = (value) => typeof value === 'string' && /\{\{[^{}]+\}\}/.test(value);
const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

if (config) {
  if (config.environment !== 'production') errors.push('SITE_CONFIG.environment должен быть production.');
  if (!config.maxUrl || isPlaceholder(config.maxUrl) || !isHttpsUrl(config.maxUrl)) {
    errors.push('SITE_CONFIG.maxUrl не заполнен допустимой HTTPS-ссылкой.');
  }
  if (!config.email || isPlaceholder(config.email) || !isEmail(config.email)) {
    errors.push('SITE_CONFIG.email не заполнен допустимым адресом.');
  }
  if (config.maxPrefillUrlTemplate) {
    if (!config.maxPrefillUrlTemplate.includes('{message}')) {
      errors.push('maxPrefillUrlTemplate должен содержать маркер {message}.');
    } else if (!isHttpsUrl(config.maxPrefillUrlTemplate.replace('{message}', encodeURIComponent('Проверка')))) {
      errors.push('maxPrefillUrlTemplate не формирует допустимую HTTPS-ссылку.');
    }
  }
}

if (errors.length) {
  console.error('Production check: FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Production check: PASS');
}
