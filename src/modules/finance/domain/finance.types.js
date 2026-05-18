/**
 * Tipos documentais do domínio financeiro.
 *
 * @typedef {Object} FinanceItem
 * @property {string} nome
 * @property {string} valor_previsto
 * @property {string} valor_realizado
 * @property {boolean} realized
 * @property {string} [valor] - Campo legado mantido por compatibilidade
 */

/**
 * @typedef {Object} ContaSubcat
 * @property {string} nome
 * @property {string} valor_previsto
 * @property {string} valor_realizado
 * @property {boolean} realized
 * @property {string} [valor] - Campo legado mantido por compatibilidade
 */

/**
 * @typedef {Object} ContaGrupo
 * @property {string} nome
 * @property {ContaSubcat[]} subcats
 */

export {};
