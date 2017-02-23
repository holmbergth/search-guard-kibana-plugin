const pluginRoot = require('requirefrom')('');
import { resolve, join, sep } from 'path';

export default function (kibana) {

    let APP_ROOT;
    let API_ROOT;
    let authenticationBackend;
    let searchGuardConfiguration;

    return new kibana.Plugin({
        name: 'searchguard',
        require: ['kibana', 'elasticsearch'],

        config: function (Joi) {
            var obj = Joi.object({
                enabled: Joi.boolean().default(true),
                cookie: Joi.object().keys({
                    secure: Joi.boolean().default(false),
                    name: Joi.string().default('searchguard_authentication'),
                    password: Joi.string().min(32).default('searchguard_cookie_default_password'),
                    ttl: Joi.number().integer().min(1).default(60 * 60 * 1000),
                }).default(),
                session: Joi.object().keys({
                    ttl: Joi.number().integer().min(1).default(60 * 60 * 1000),
                    keepalive: Joi.boolean().default(true),
                }).default(),
                basicauth: Joi.object().keys({
                    enabled: Joi.boolean().default(true)
                }).default(),
                multitenancy: Joi.object().keys({
                    enabled: Joi.boolean().default(false)
                }).default()
            }).default();
            return obj;
        },

        uiExports: {
            hacks: [
                'plugins/searchguard/chrome/logout_button',
                'plugins/searchguard/services/access_control'
            ],
            apps: [
                {
                    id: 'searchguard-login',
                    title: 'Login',
                    main: 'plugins/searchguard/apps/login',
                    hidden: true,
                    auth: false
                }
                ,
                {
                    id: 'searchguard-multitenancy',
                    title: 'Multitenancy',
                    main: 'plugins/searchguard/apps/multitenancy',
                    hidden: false,
                    auth: true
                }
            ],
            chromeNavControls: [
                'plugins/searchguard/chrome/btn_logout/btn_logout.js'
            ]
        },

        init(server, options) {

            APP_ROOT = '/searchguard';
            API_ROOT = `${APP_ROOT}/api`;
            const config = server.config();

            // all your routes are belong to us
            require('./lib/auth/routes_authinfo')(pluginRoot, server, this, APP_ROOT, API_ROOT);


            // provides authentication methods against Search Guard
            const BackendClass = pluginRoot(`lib/backend/searchguard`);
            const searchguardBackend = new BackendClass(server, server.config);
            server.expose('getSearchGuardBackend', () => searchguardBackend);

            if(config.get('searchguard.basicauth.enabled')) {
                server.register([
                    require('hapi-async-handler'),
                    require('hapi-auth-cookie'),
                    require('hapi-authorization')
                ], (error) => {

                    if (error) {
                        server.log(['error', 'searchguard'], `An error occurred registering server plugins: ${error}`);
                        this.status.red('An error occurred during initialisation, please check the logs.');
                        return;
                    }

                    this.status.yellow('Initialising Search Guard authentication plugin.');

                    if(config.get("searchguard.cookie.password") == 'searchguard_cookie_default_password') {
                        this.status.yellow("Default cookie password detected, please set a password in kibana.yml by setting 'searchguard.cookie.password' (min. 32 characters).");
                    }

                    if(!config.get("searchguard.cookie.secure")) {
                        this.status.yellow("'searchguard.cookie.secure' is set to false, cookies are transmitted over unsecure HTTP connection. Consider using HTTPS and set this key to 'true'");
                    }

                    // we use the cookie strategy
                    require('./lib/hapi/auth')(pluginRoot, server, APP_ROOT, API_ROOT);

                    // all your routes are belong to us
                    require('./lib/auth/routes')(pluginRoot, server, this, APP_ROOT, API_ROOT);

                    this.status.yellow('Search Guard HTTP Basic Authentication enabled.');

                });

            } else {
                this.status.yellow('Search Guard HTTP Basic Authentication is disabled.');
            }


            if(config.get('searchguard.multitenancy.enabled')) {
                require('./lib/multitenancy/routes')(pluginRoot, server, this, APP_ROOT, API_ROOT);
                require('./lib/multitenancy/headers')(pluginRoot, server, this, APP_ROOT, API_ROOT);

                server.state('searchguard_tenant', {
                    ttl: null,
                    path: '/',
                    isSecure: false,
                    isHttpOnly: false,
                    clearInvalid: true, // remove invalid cookies
                    strictHeader: true // don't allow violations of RFC 6265
                });

                this.status.yellow("Search Guard multitenancy enabled");
            } else {
                this.status.yellow("Search Guard multitenancy disabled");
            }
            this.status.green('Search Guard plugin initialised.');

        }

    });
};
