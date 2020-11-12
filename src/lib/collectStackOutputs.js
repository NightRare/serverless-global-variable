"use strict";

const chalk = require("chalk");

function describeStack(AWS, outputs, nextToken) {
  outputs = outputs || [];
  return AWS.request("CloudFormation", "describeStacks", {
    StackName: AWS.naming.getStackName(),
    NextToken: nextToken,
  })
    .then((response) => {
      outputs.push.apply(outputs, response.Stacks[0].Outputs);
      if (response.NextToken) {
        // Query next page
        return describeStack(AWS, outputs, response.NextToken);
      }
    })
    .catch((e) => {
      if (
        e.message ===
        `Stack with id ${AWS.naming.getStackName()} does not exist`
      ) {
        console.warn(
          chalk`{yellow {bold WARNNING: Failed to retrieve Outputs of this stack from Cloudformation.}}`
        );
        console.warn(
          chalk`{yellow {bold If this stack has not been created before, you need to deploy again to make sure the Outputs of this stack gets injected into this and other depended stacks. }}`
        );
      } else throw e;
    })
    .return(outputs);
}

/**
 * Collects CloudFormation stack outputs
 *
 * @param {Serverless} serverless - Serverless Instance
 * @returns {Promise<Array[Map]>} Resolves with the list of outputs
 */
function collectStackOutputs(serverless) {
  const AWS = serverless.providers.aws;

  return describeStack(AWS);
}

module.exports = collectStackOutputs;
