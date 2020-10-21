"use strict";

const _ = require("lodash"),
  fs = require("fs"),
  path = require("path");

const collectOfflineEnvVariables = require("./lib/collectOfflineEnvVariables");
const resolveCloudFormationGlobalVariables = require("./lib/resolveCloudFormationGlobalVariables");
const collectResourcesOutputs = require("./lib/collectResourcesOutputs");
const collectStackOutputs = require("./lib/collectStackOutputs");

class GlobalVariables {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      "global-variables": {
        usage:
          "Exports your defined variables and CloudFormation exports to a .vars.json file ",
        lifecycleEvents: ["collect", "resolve", "write"],
      },
    };

    this.isOfflineHooked = false;
    this.hooks = {
      "before:package:initialize": this.init.bind(this),
      "before:offline:start:init": this.init.bind(this, true),
      "before:offline:start": this.init.bind(this, true),
      "before:invoke:local:loadEnvVars": this.init.bind(this, true),
      "before:invoke:local:invoke": this.init.bind(this, true),

      "global-variables:collect": this.collectGlobalVars.bind(this),
      "global-variables:resolve": this.resolveEnvVars.bind(this),
      "global-variables:write": this.writeEnvVars.bind(this),
    };

    this.globalVariables = {};
    this.varFileName = ".vars.json";
  }

  init(isOffline) {
    this.isOfflineHooked = isOffline;
    return this.serverless.pluginManager.run(["global-variables"]);
  }

  collectGlobalVars() {
    return BbPromise.try(() => {
      const globalVars = {};

      return collectStackOutputs(this.serverless).then((stackOutputs) => {
        // collect Resources Outputs
        const resourcesOutputs = collectResourcesOutputs(
          this.serverless,
          stackOutputs
        );
        _.assign(globalVars, resourcesOutputs);

        // collect environment variables for serverless offline
        if (this.isOfflineHooked) {
          const offlineEnvVars = collectOfflineEnvVariables(
            this.serverless,
            this.options
          );
          _.assign(globalVars, offlineEnvVars);
        }

        _.assign(
          globalVars,
          this.serverless.service.custom.globalVariables || {}
        );

        process.env.SLS_DEBUG &&
          this.serverless.cli.log(
            `Found ${_.size(globalVars)} environment variable(s)`
          );

        this.globalVariables = globalVars;
        return BbPromise.resolve();
      });
    });
  }

  resolveEnvVars() {
    // resolve environment variables referencing CloudFormation
    return resolveCloudFormationGlobalVariables(
      this.serverless,
      this.globalVariables
    )
      .then((resolved) => (this.globalVariables = resolved))
      .return();
  }

  writeEnvVars() {
    return BbPromise.try(() => {
      const params = _.get(this.serverless, "service.custom.global-variables");

      let filename = this.varFileName;
      let pathFromRoot = "";

      if (params != null) {
        if (params.filename != null) filename = params.filename;
        if (params.pathFromRoot != null) pathFromRoot = params.pathFromRoot;
      }

      process.env.SLS_DEBUG &&
        this.serverless.cli.log(`Writing ${filename} file`);

      const envFilePath = path.resolve(
        this.serverless.config.servicePath,
        pathFromRoot,
        filename
      );

      const json = JSON.stringify(this.globalVariables, null, 2);

      fs.writeFileSync(envFilePath, json);
    });
  }
}

module.exports = GlobalVariables;
