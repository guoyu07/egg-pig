'use strict';

const is = require('is-type-of');
const utils = require('../utils');
const {
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_NAME_METADATA,
  REST_MAP,
} = require('../constants');


const REST_VERB_ARR = Object.keys(REST_MAP);

/**
 *  main
 */
module.exports = {


  createMethodsProxy() {
    const routers = this.getRouters();
    routers.forEach(({ metatype, fullpath }) => {
      const routerProperties = this.scanForController(metatype);
      this.applyPropertyToRouter(routerProperties, metatype, fullpath);
    });
  },

  applyPropertyToRouter(routerProperties, router, fullpath) {
    routerProperties.forEach(routerProperty => {
      this.createCallbackProxy(routerProperty, router);
      this.resolveRouterPath(router, routerProperty.method, fullpath);
    });
  },

  scanForController(controller) {
    const ret = [];
    let proto = controller.prototype;
    const { isRestful } = this.reflectClassMetadata(proto, PATH_METADATA);
    while (proto !== Object.prototype) {
      const keys = Object.getOwnPropertyNames(proto);
      for (const key of keys) {

        const path = this.reflectMethodMetadata(proto, key, PATH_METADATA);

        if (key === 'constructor') {
          continue;
        } else if (!path && !isRestful) { /* mehtod of controlelr does not have decorator*/
          continue;
        } else if (!path && !REST_VERB_ARR.some(name => name === key)) { /* methods(restController) not in rest.verbs*/
          continue;
        }

        const d = Object.getOwnPropertyDescriptor(proto, key);
        if (is.function(d.value)) {
          ret.push({
            method: key,
            targetCallback: utils.convertGeneratorFunction(proto[key]),
          });
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    return ret;
  },

  resolveRouterPath(controller, method, fullpath) {

    const proto = controller.prototype;
    const path = this.reflectMethodMetadata(proto, method, PATH_METADATA);
    const routeName = this.reflectMethodMetadata(proto, method, ROUTE_NAME_METADATA);
    const requestMethod = this.reflectMethodMetadata(proto, method, METHOD_METADATA);
    const controlerMetadata = this.reflectClassMetadata(proto, PATH_METADATA);

    const controllerWrapper = this._routers.get(fullpath);
    const routerMetadata = controllerWrapper.routerMetadata;
    const routerPaths = controllerWrapper.routerPaths;

    controllerWrapper.routerMetadata = routerMetadata ? routerMetadata : controlerMetadata;

    if (path && controlerMetadata) {
      routerPaths.push({ path, method, routeName, requestMethod /* 0('get) 1('post') */ });
    }

  },

};
