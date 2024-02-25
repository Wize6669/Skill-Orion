// Moments library will help us do all the time math
const moment = require('moment-timezone');

// Fetch library
const fetch = require('node-fetch');

module.exports = {
    createCustomReminder(periodTime, message, locale) {
        // const timezone = 'America/Mexico_City';
        const timezone = 'America/Guayaquil';

        let now = moment.tz(timezone);
        let scheduled = moment.tz(timezone);

        if (periodTime > 60) {
            const hours = Math.floor(periodTime / 60);
            let aux = now.add(hours, "hour");
            scheduled = aux.format('YYYY-MM-DDTHH:mm:00.000');
            console.log('Hours ' + hours);
        }

        scheduled = now.add(periodTime, "minutes");

        let scheduledFormat = scheduled.format('YYYY-MM-DDTHH:mm:00.000');

        return {
            requestTime: now.format('YYYY-MM-DDTHH:mm:00.000'),
            trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: scheduled.format('YYYY-MM-DDTHH:mm:00.000'),
                timeZoneId: timezone,
            },
            alertInfo: {
                spokenInfo: {
                    content: [{
                        locale: locale,
                        text: message,
                    }],
                },
            },
            pushNotification: {
                status: 'ENABLED'
            }
        }
    },

    getEmergencyOrders(url, accessToken) {
        async function getEmergencyOrdersAPI(url, accessToken) {
            const urlFetch = `${url}`;
            let emergencyOrder = {};
            const options = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
            };

            try {
                const response = await fetch(urlFetch, options);
                if (!response.ok) {
                    console.log("Error fetching the data");
                    return emergencyOrder
                }
                const orders = await response.json();
                console.log("report", orders)
                const { G, P, R, L, V } = orders;
                emergencyOrder = {
                    "generated": G === 0 ? 'no hay órdenes': G,
                    "inProcess": P === 0 ? 'no hay órdenes': P,
                    "preliminary": L  === 0 ? 'no hay órdenes': L,
                    "reported": R  === 0 ? 'no hay órdenes': R,
                    "validated": V  === 0 ? 'no hay órdenes': V
                }
                console.log("Res report", emergencyOrder)
                return emergencyOrder;
            } catch (e) {
                console.error("Error with method getEmergencyOrders " + e);
            }
        }
        
        return getEmergencyOrdersAPI(url, accessToken).then((result) => {
            return result
        }).catch((error) => {
            return null
        });
    },
    
    login(url, credentials) {
        async function loginAPI(url, credentials) {
        console.log("logic", credentials);
        console.log("logic", url);
        console.log("------");
        console.log(JSON.stringify(credentials));
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            //body: '{"pin":3545}'
            body: JSON.stringify(credentials),
        };

        try {
          const response = await fetch(url, options);
          if (response.status === 401) {
              console.log("Invalid credentials");
          }
          
          if (!response.ok) {
            console.log("Error fetching the PIN");
          }
          
          const aux = await response.json();
          console.log("logic Response", aux)
          return aux;
        } catch (error) {
          console.log("Error" + error);
        }
    }

    return loginAPI(url, credentials)
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
      return null;
    });
},

    getFinalURL(url, subDomain) {
  // Validate that the URL has an HTTP or HTTPS prefix
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "http://" + url;
  }

  // Find the position of the two points
  const doubleSlashIndex = url.indexOf("//");

  // If the colon is not found, return the original URL
  if (doubleSlashIndex === -1) {
    return url;
  }

  // Insert the word after the colon
  return url.slice(0, doubleSlashIndex + 2) + subDomain + "." + url.slice(doubleSlashIndex + 2);
},
getWeekDates() {
  const timezone = "America/Guayaquil";
  const now = moment.tz(timezone);
  const auxDate = moment.tz(timezone);

  const now2 = moment.tz(timezone);
  const auxDat2 = moment.tz(timezone);

  let dateFrom, dateTo;

  switch (now.day()) {
    case 0:
      dateFrom = auxDate.subtract(6, "days").format("YYYY-MM-DD");
      dateTo = now.format("YYYY-MM-DD");
      break;
    case 1:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    case 2:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    case 3:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    case 4:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    case 5:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    case 6:
      dateFrom = now.subtract(1, "day").format("YYYY-MM-DD");
      dateTo = auxDate.add(6, "days").format("YYYY-MM-DD");
      break;
    default:
      console.log("Error");
      break;
  }

  return { dateFrom, dateTo };
},
    saveInfo(url, userInfo) {
        async function saveAPI(url, userInfo) {
        console.log("Info", userInfo);
        console.log("saveAPI", url);
        console.log("------");
        console.log(JSON.stringify(userInfo));
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userInfo),
        };

        try {
          const response = await fetch(url, options);
          if (response.status === 401) {
              console.log("Invalid credentials");
          }
          
          if (!response.ok) {
            console.log("Error fetching the PIN");
          }
          
          const aux = await response.json();
          console.log("logic Response", aux)
          return aux;
        } catch (error) {
          console.log("Error" + error);
        }
    }

    return saveAPI(url, userInfo)
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
      return null;
    });
},


    callDirectiveService(handlerInput, msg) {
        // Call Alexa Directive Service.
        const {requestEnvelope} = handlerInput;
        const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
        const requestId = requestEnvelope.request.requestId;
        const {apiEndpoint, apiAccessToken} = requestEnvelope.context.System;
        
        // build the progressive response directive
        const directive = {
            header: {
                requestId
            },
            directive:{
                type: 'VoicePlayer.Speak',
                speech: msg
            }
        };
        // send directive
        return directiveServiceClient.enqueue(directive, apiEndpoint, apiAccessToken);
    },
    
};
