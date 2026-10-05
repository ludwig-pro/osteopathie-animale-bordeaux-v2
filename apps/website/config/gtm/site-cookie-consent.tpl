___INFO___
{
  "type": "TAG",
  "id": "cvt_SiteCookieConsent",
  "version": 1,
  "displayName": "Site CookieConsent - Google consent bridge",
  "description": "Reads siteConsent from the site, sets Google consent via the official APIs, then emits site_consent_ready. No network access.",
  "containerContexts": [
    "WEB"
  ],
  "securityGroups": []
}

___TEMPLATE_PARAMETERS___
[
  {
    "type": "SELECT",
    "name": "mode",
    "displayName": "Mode",
    "selectItems": [
      {
        "value": "initialize",
        "displayValue": "Initialize default consent"
      },
      {
        "value": "update",
        "displayValue": "Update visitor choice"
      }
    ],
    "simpleValueType": true,
    "defaultValue": "initialize"
  }
]

___SANDBOXED_JS_FOR_WEB_TEMPLATE___
const copyFromWindow = require('copyFromWindow');
const setDefaultConsentState = require('setDefaultConsentState');
const updateConsentState = require('updateConsentState');
const createQueue = require('createQueue');

// Old deployments retain their existing GTM behavior until the site is updated.
if (copyFromWindow('__cookieConsentManaged') !== true) {
  data.gtmOnSuccess();
  return;
}

if (data.mode === 'initialize') {
  setDefaultConsentState({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
}

const consent = copyFromWindow('siteConsent') || {};
const analytics = consent.googleAnalytics === true ? 'granted' : 'denied';
const advertising = consent.googleAds === true ? 'granted' : 'denied';
updateConsentState({
  analytics_storage: analytics,
  ad_storage: advertising,
  ad_user_data: advertising,
  ad_personalization: advertising
});

// Google processes the consent API update before this queued event. Tags must
// wait for this event rather than firing during site_consent_update itself.
const push = createQueue('dataLayer');
push({event: 'site_consent_ready'});
data.gtmOnSuccess();


___WEB_PERMISSIONS___
[
  {
    "instance": {
      "key": {
        "publicId": "access_globals",
        "versionId": "1"
      },
      "param": [
        {
          "key": "keys",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "key"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  },
                  {
                    "type": 1,
                    "string": "execute"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "__cookieConsentManaged"
                  },
                  {
                    "type": 8,
                    "boolean": true
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": false
                  }
                ]
              },
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "key"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  },
                  {
                    "type": 1,
                    "string": "execute"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "siteConsent"
                  },
                  {
                    "type": 8,
                    "boolean": true
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": false
                  }
                ]
              },
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "key"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  },
                  {
                    "type": 1,
                    "string": "execute"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "dataLayer"
                  },
                  {
                    "type": 8,
                    "boolean": true
                  },
                  {
                    "type": 8,
                    "boolean": true
                  },
                  {
                    "type": 8,
                    "boolean": false
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "access_consent",
        "versionId": "1"
      },
      "param": [
        {
          "key": "consentTypes",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "consentType"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "analytics_storage"
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": true
                  }
                ]
              },
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "consentType"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "ad_storage"
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": true
                  }
                ]
              },
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "consentType"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "ad_user_data"
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": true
                  }
                ]
              },
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "consentType"
                  },
                  {
                    "type": 1,
                    "string": "read"
                  },
                  {
                    "type": 1,
                    "string": "write"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "ad_personalization"
                  },
                  {
                    "type": 8,
                    "boolean": false
                  },
                  {
                    "type": 8,
                    "boolean": true
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  }
]

___TESTS___
scenarios:
- name: Legacy deployment does not alter Google consent
  code: |-
    mock('copyFromWindow', function(key) { return undefined; });
    runCode({mode: 'initialize'});
    assertApi('setDefaultConsentState').wasNotCalled();
    assertApi('updateConsentState').wasNotCalled();
    assertApi('createQueue').wasNotCalled();
    assertApi('gtmOnSuccess').wasCalled();
- name: Missing choice stays denied
  code: |-
    mock('copyFromWindow', function(key) {
      return key === '__cookieConsentManaged' ? true : undefined;
    });
    mock('createQueue', function() { return function(event) {}; });
    runCode({mode: 'initialize'});
    assertApi('setDefaultConsentState').wasCalledWith({
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    assertApi('updateConsentState').wasCalledWith({
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
- name: Analytics choice does not grant advertising
  code: |-
    mock('copyFromWindow', function(key) {
      return key === '__cookieConsentManaged' ? true : {googleAnalytics: true, googleAds: false};
    });
    mock('createQueue', function() { return function(event) {}; });
    runCode({mode: 'initialize'});
    assertApi('updateConsentState').wasCalledWith({
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
- name: Advertising update does not grant analytics or reset defaults
  code: |-
    mock('copyFromWindow', function(key) {
      return key === '__cookieConsentManaged' ? true : {googleAnalytics: false, googleAds: true};
    });
    let queued;
    mock('createQueue', function() { return function(event) { queued = event; }; });
    runCode({mode: 'update'});
    assertApi('setDefaultConsentState').wasNotCalled();
    assertApi('updateConsentState').wasCalledWith({
      analytics_storage: 'denied', ad_storage: 'granted',
      ad_user_data: 'granted', ad_personalization: 'granted'
    });
    assertThat(queued).isEqualTo({event: 'site_consent_ready'});


___NOTES___
Uses https://developers.google.com/tag-platform/tag-manager/templates/api and https://developers.google.com/tag-platform/tag-manager/templates/consent-apis.
