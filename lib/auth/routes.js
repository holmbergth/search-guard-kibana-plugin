/**
 *    Copyright 2016 floragunn GmbH

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { isEmpty } from 'lodash';

module.exports = function (pluginRoot, server, kbnServer, APP_ROOT, API_ROOT) {

    const AuthenticationError = pluginRoot('lib/auth/authentication_error');
    const config = server.config();
    const sessionTTL = config.get('searchguard.session.ttl');
    const loginApp = kbnServer.apps.byId['searchguard-login'];

    /**
     * The login page.
     */
    server.route({
        method: 'GET',
        path:  `${APP_ROOT}/login`,
        handler(request, reply) {
            return reply.renderAppWithDefaultConfig(loginApp);
        },
        config: {
            auth: false
        }
    });



    server.route({
        method: 'POST',
        path: `${API_ROOT}/v1/auth/login`,
        handler: {
            async: async (request, reply) => {
                try {
                    let user = await server.plugins.searchguard.getSearchGuardBackend().authenticate(request.payload);
                    let session = {
                        username: user.username,
                        credentials: user.credentials,
                        proxyCredentials: user.proxyCredentials
                    };
                    if (sessionTTL) {
                        session.expiryTime = Date.now() + sessionTTL;
                    }
                    request.auth.session.set(session);

                    // handle tenants if MT is enabled
                    if(server.config().get("searchguard.multitenancy.enabled")) {

                        // get the preferred tenant of the user
                        let globalTenantEnabled = server.config().get("searchguard.multitenancy.tenants.enable_global");
                        let privateTenantEnabled = server.config().get("searchguard.multitenancy.tenants.enable_private");
                        let preferredTenant = server.plugins.searchguard.getSearchGuardBackend().getTenantByPreference(request, user.username, user.tenants, globalTenantEnabled, privateTenantEnabled);

                        return reply({
                            username: user.username,
                            tenants: user.tenants
                        }).state('searchguard_tenant', preferredTenant);
                    } else {
                        // no MT, nothing more to do
                        return reply({
                            username: user.username,
                            tenants: user.tenants
                        });
                    }
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        return reply(Boom.unauthorized(error.message));
                    } else {
                        return reply(Boom.badImplementation(error.message));
                    }
                }
            }
        },
        config: {
            validate: {
                payload: {
                    username: Joi.string().required(),
                    password: Joi.string().required()
                }
            },
            auth: false
        }
    });

    server.route({
        method: 'POST',
        path: `${API_ROOT}/v1/auth/logout`,
        handler: (request, reply) => {
            request.auth.session.clear();
            reply({}).unstate('searchguard_tenant');
        },
        config: {
            auth: false
        }
    });

}; //end module
