"use strict";

const _ = require("lodash");

/**
 * Collects Serverless Outputs resources
 *
 * @param {Serverless} serverless - Serverless Instance
 * @param {Array[Map]} stackOutputs - an array of stack outputs
 * @returns {String[]} Returns a list of global variables
 */
function collectResourcesOutputs(serverless, stackOutputs = {}) {
  const outputs = _.get(serverless, "service.resources.Outputs", []);
  const globalVariables = {};

  _.each(_.keys(outputs), (key) => {
    const outputValue = _.find(stackOutputs, ["OutputKey", key]);
    const value =
      outputValue !== undefined && outputValue["OutputValue"] !== undefined
        ? outputValue["OutputValue"]
        : outputs[key].Value;
    const globalVarKey = _.toUpper(_.snakeCase(key));
    const globalVar = { [globalVarKey]: value };
    _.assign(globalVariables, globalVar);
  });

  return globalVariables;
}

module.exports = collectResourcesOutputs;
