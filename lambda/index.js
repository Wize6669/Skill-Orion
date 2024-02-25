/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');

const fetch = require('node-fetch');

// Get an instance of the persistence adapter
//var persistenceAdapter = getPersistenceAdapter();
const persistence = require('./persistence');
const interceptors = require('./interceptors');

// si admite el https:,,,.mp3 (Todos toca probar)
const Alarms_Back_Up_Beeps = `<audio src="soundbank://soundlibrary/alarms/back_up_beeps/back_up_beeps_06"/>`;
const Hurry_Up = '<say-as interpret-as="interjection">córrele</say-as>'

// Moments library will help us do all the birthday math
const moment = require('moment-timezone');
require('dotenv').config();

// utility functions
const util = require('./util');

// constants such as specific service permissions go here
const constants = require('./constants'); 

// this file encapsulates all "business" logic
const logic = require('./logic');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        
        const laboratoryName = sessionAttributes['laboratoryName'];
        const branchName = sessionAttributes['branchName'];
        const laboratoryID = sessionAttributes['laboratoryID'];
        const branchCode = sessionAttributes['branchCode'];
        
        const subDomain = sessionAttributes['subDominio'];
        const accessToken = sessionAttributes['accessToken'];
        
        const userId = sessionAttributes['userId'];
        const email = sessionAttributes['email'];
        
        if(!sessionAttributes['name']) {
            try {
                const {permissions} = requestEnvelope.context.System.user;
                if(!permissions) {
                    throw {statusCode: 401, message: 'No permissions available'}
                }
                const userId = handlerInput.requestEnvelope.context.System.user.userId;
                const email = handlerInput.requestEnvelope.context.System.user.email;
                sessionAttributes['userId'] = userId;
                sessionAttributes['email'] = email;
                
            }catch (e) {
                console.log("No permissions available")
            }
        }
        
        let speakOutput = '';
        
        if (!(laboratoryName && branchName && subDomain && accessToken)) {
            speakOutput = 'Te falta configuraralgunas cosas para poder utilizar la skill de manera correcta. Para configurar lo que te falta puedes decir "Configurar skill".' +
            'Luego, no te olvides de iniciar sesión en el sistema Orión. Para eso luego de configurar las cosas que te faltan debes decir el comando "Login"';
        }
        
        //speakOutput = Hurry_Up + ' Hola, te encuentras en el Laboratorio ' + laboratoryName + ' y en la sucursal ' + branch2 + Alarms_Back_Up_Beeps;
        speakOutput = ' Hola, te encuentras en  ' + laboratoryName + ' y en la sucursal ' + branchName;
        //console.log("V2" + laboratoryName + " "+ branch + " "+ subDominio);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ConfigureSkillIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfigureSkillIntent';
    },
    handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        let laboratoryID = Alexa.getSlotValue(handlerInput.requestEnvelope, 'laboratoryID');
        let branchCode = Alexa.getSlotValue(handlerInput.requestEnvelope, 'branchCode');

        console.log("laboratoryID ", laboratoryID)
        console.log("branchCode ", branchCode)
        
        sessionAttributes['laboratoryID'] = laboratoryID;
        sessionAttributes['branchCode'] = branchCode;

        
        const speakOutput = 'El id del Laboratorio que se guardará es '+ laboratoryID +' y el id de la sucursal es '+ branchCode;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Los datos que guardaste son, id laboratorio '+ laboratoryID + ' y id sucursal '+ branchCode)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const LoginIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LoginIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const laboratoryID = parseInt(sessionAttributes['laboratoryID']);
        const branchCode = parseInt(sessionAttributes['branchCode']);
        
        const userID = handlerInput.requestEnvelope.context.System.user.userId;
        const email = handlerInput.requestEnvelope.context.System.user.email;
        
        let accessCode = Alexa.getSlotValue(handlerInput.requestEnvelope, 'accessCode');
        
        console.log("PIN ", accessCode);
        
        let speakOutput = '';
        const progressiveMsg = 'Por favor, espera un momento mientras intentamos iniciar sesión con el laboratorio con el id ' + laboratoryID + " y con el id sucursal " + branchCode;
         try {
            // call the progressive response service
            await logic.callDirectiveService(handlerInput, progressiveMsg);
        } catch (error) {
            // if it fails we can continue, but the user will wait without progressive response
            console.log("Progressive response directive error : " + error);
        }
    
    // const url = "https://api-v2-node.onrender.com/login";
    const url = "https://iot.orion-labs.com/login";
    
    const credentials = {
        tenant_id: laboratoryID,
        sucursal_id: branchCode,
        sistema_externo_id: 523,
        pin: accessCode
    }
    
        try {
            const response = await logic.login(url, credentials);
            console.log("Respuesta del end point login", response)

            const {tenant, sucursal, subdominio, api_token:accessToken } = response;
            
            sessionAttributes['laboratoryName'] = tenant;
            sessionAttributes['branchName'] = sucursal;
            sessionAttributes['subDomain'] = subdominio;
            sessionAttributes['accessToken'] = accessToken;
            
            speakOutput = 'La respuesta al intento de inicio de sesión fue exitosa';
            
            const userInfo = {laboratoryID, branchCode, email,userID};
            //const url2 = "https://webhook.site/3d6da4a1-35e4-448e-bd1f-d0bdccef1285"
            const url2 = "https://heaven-generally-similar-hi.trycloudflare.com/api/v1/create-laboratory-info"
            
            const responseuserInfo = await logic.saveInfo(url2, userInfo);
            console.log(responseuserInfo);
            
        } catch (error) {
            console.error(error);
            speakOutput = 'Lo siento, las credenciales son incorrectas';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const GetEmergencyOrdersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetEmergencyOrdersIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        const subDomain = sessionAttributes['subDomain'];
        const accessToken = sessionAttributes['accessToken'];
        
        let speakOutput = '';
        const progressiveMsg = "Espera un momento, se está consultando la información";
        
         try {
            // call the progressive response service
            await logic.callDirectiveService(handlerInput, progressiveMsg);
        } catch (error) {
            // if it fails we can continue, but the user will wait without progressive response
            console.log("Progressive response directive error : " + error);
        }
        
        //const url = 'https://api-v2-node.onrender.com/api/v1/orders-summary?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=true';
        const dateQuery = logic.getWeekDates()
        const { dateFrom, dateTo } = dateQuery;
        const urlT = `https://orion-labs.com/api/v1/ordenes-resumen?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=true`;
        const subD = subDomain;
        const url = logic.getFinalURL(urlT, subD);
        
        try {
            const response = await logic.getEmergencyOrders(url, accessToken);
        
            const { generated, inProcess, preliminary, reported, validated } = response;
            console.log("fornt", response)
            
            speakOutput = 'Existe la siguiente carga de trabajo: generado: '+ generated + ' ,en proceso: ' + inProcess + ', reportada: ' + reported + ' , preliminar: '+ preliminary  + ' y validada: '+ validated;
            
        } catch (error) {
            console.error(error);
            speakOutput = 'Lo siento, hubo un error con la consulta de los datos. Puedes intentar otra acción';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const GetOrdersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetOrdersIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        const subDomain = sessionAttributes['subDomain'];
        const accessToken = sessionAttributes['accessToken'];
        
        let speakOutput = '';
        const progressiveMsg = "Espera un momento, se está consultando la información";
        
         try {
            // call the progressive response service
            await logic.callDirectiveService(handlerInput, progressiveMsg);
        } catch (error) {
            // if it fails we can continue, but the user will wait without progressive response
            console.log("Progressive response directive error : " + error);
        }
        
        //const url = 'https://api-v2-node.onrender.com/api/v1/orders-summary?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=true';
        const dateQuery = logic.getWeekDates()
        const { dateFrom, dateTo } = dateQuery;
        const urlT = `https://orion-labs.com/api/v1/ordenes-resumen?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=false`;
        const subD = subDomain;
        const url = logic.getFinalURL(urlT, subD);
        
        try {
            const response = await logic.getEmergencyOrders(url, accessToken);
        
            const { generated, inProcess, preliminary, reported, validated } = response;
            console.log("fornt", response)
            
            speakOutput = 'Existe la siguiente carga de trabajo: generado: '+ generated + ' ,en proceso: ' + inProcess + ', reportada: ' + reported + ' , preliminar: '+ preliminary  + ' y validada: '+ validated;
            
        } catch (error) {
            console.error(error);
            speakOutput = 'Lo siento, hubo un error con la consulta de los datos. Puedes intentar otra acción';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};



const RemindEmergencyOrdersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RemindEmergencyOrdersIntent';
    },
    async handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;
        
        const subDomain = sessionAttributes['subDomain'];
        const accessToken = sessionAttributes['accessToken'];
        
        //const url = 'https://api-v2-node.onrender.com/api/v1/orders-summary?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=true';

        const dateQuery = logic.getWeekDates()
        const { dateFrom, dateTo } = dateQuery;
        const urlT = `https://orion-labs.com/api/v1/ordenes-resumen?fecha_orden_desde=${dateFrom}&fecha_orden_hasta=${dateTo}&emergencia=true`;
        const subD = subDomain;
        console.log("Fecha del reporte");
        console.log({ dateFrom, dateTo })
        const url = logic.getFinalURL(urlT, subD);
        console.log("URL API tenant", url)
        
        let periodTime = Alexa.getSlotValue(handlerInput.requestEnvelope, 'periodTime');
        console.log("Dentro de  " + periodTime);
        
        let speakOutput = '';
        
        const locale = Alexa.getLocale(requestEnvelope);
        //console.log("El locale "+ locale);
        
        const timezone = 'America/Guayaquil';
        const date = moment.tz(timezone);
        //console.log("date sin format "+ date);
        
        //console.log("date con format "+ date.format('YYYY-MM-DDTHH:mm:00.000'));
        
        let message = '';
        
        try {
            const response = await logic.getEmergencyOrders(url, accessToken);
        
            const { generated, inProcess, preliminary, reported, validated } = response;
            
            message = 'Cuando se creó el recordatorio, existía la siguiente carga de trabajo: generado: '+ generated + ' ,en proceso: ' + inProcess + ', reportada: ' + reported + ' , preliminar: '+ preliminary  + ' y validada: '+ validated;
            
        } catch (error) {
            console.error(error);
            speakOutput =+ ' Lo siento, hubo un error con la consulta de los datos para crear el recordatorio. Se creo un mensaje de generico ';
            message = ' Lo siento, hubo un error con la consulta de los datos para crear el recordatorio. Por eso se escribió este mensaje ';
        }
        
        
        
  // let's create a reminder via the Reminders API
  // don't forget to enable this permission in your skill configuratiuon (Build tab -> Permissions)
  // or you'll get a SessionEnndedRequest with an ERROR of type INVALID_RESPONSE
  try {
    const { permissions } = requestEnvelope.context.System.user;
    //console.log("Reminder ************ 11" + permissions);
    if (!(permissions && permissions.consentToken)) {
        console.log("No permissions available 401");
        throw { statusCode: 401, message: "No permissions available" }; // there are zero permissions, no point in intializing the API
    }
    //console.log("Reminder ************ 22");
    const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
    // reminders are retained for 3 days after they 'remind' the customer before being deleted
    // Erro en la linea 197
    //console.log("Reminder ************ 33" + reminderServiceClient);
    const remindersList = await reminderServiceClient.getReminders();
    //console.log("Current reminders: " + JSON.stringify(remindersList));
    // delete previous reminder if present
    const previousReminder = sessionAttributes["reminderId"];
    if (previousReminder) {
      try {
        if (remindersList.totalCount !== "0") {
          await reminderServiceClient.deleteReminder(previousReminder);
          delete sessionAttributes["reminderId"];
          console.log("Deleted previous reminder token: " + previousReminder);
        }
      } catch (error) {
        // fail silently as this means the reminder does not exist or there was a problem with deletion
        // either way, we can move on and create the new reminder
       // console.log("Reminder ************ Error 44");
        console.log(
          "Failed to delete reminder: " +
            previousReminder +
            " via " +
            JSON.stringify(error)
        );
      }
    }
    
    // create reminder structure
    //console.log("Antess del createCustomReminder............");
    const reminder = logic.createCustomReminder(periodTime, message, locale);
    //console.log("Reminder ************ " + reminder);
    const reminderResponse = await reminderServiceClient.createReminder(reminder); // the response will include an "alertToken" which you can use to refer to this reminder
    //console.log("Despues del reminderResponse ");
    // save reminder id in session attributes
    sessionAttributes["reminderId"] = reminderResponse.alertToken;
    console.log("Reminder created with token: " + reminderResponse.alertToken);
    speakOutput = "Se creo el recordatorio de manera exitosa";
  } catch (error) {
    console.log(JSON.stringify(error));
    switch (error.statusCode) {
      case 401: // the user has to enable the permissions for reminders, let's attach a permissions card to the response
        handlerInput.responseBuilder.withAskForPermissionsConsentCard(
          constants.REMINDERS_PERMISSION
        );
        speakOutput = "Falta que habilites el permiso de recordatorios. Eso lo debes configurar desde la app de Alexa";
        break;
      case 403: // devices such as the simulator do not support reminder management
        speakOutput = "Tu dispositivo no soporta los recordatorios"
        break;
      //case 405: METHOD_NOT_ALLOWED, please contact the Alexa team
      default:
        speakOutput ="Error al crear un recordatorio ";
    }
    speakOutput += "Intenta otra acción. por favor" + periodTime;
  }
        
        
    return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hola, estás en la skill de Orión. Puedes pedirme que consulte un resumen sobre la carga de tu trabajo. ' + 
        'Para hacerlo, debes decir: "¿Cuántas órdenes de emergencia tengo?" ' + 'Además, puedes pedirme que cree un recordatorio sobre tu carga de trabajo. ' +
        'Para hacerlo, debes decir: "Crea un recordatorio para las ordenes de emergencia". ' + 'Pero antes de pedirme estas acciones, no te olvides de configurar la skill. ' + 
        'Para hacerlo, puedes decir el comando "Configurar skill". ' + 'Una vez configurada la skill, debes decir el comando "Iniciar sesión"'

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Adiós, vuelve pronto!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Lo siento, no puedo hacer esa acción. Inténtalo de nuevo.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Acabas de desencadenar el intent ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Lo siento, tuve problemas para hacer lo que me pediste. Inténtalo de nuevo';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ConfigureSkillIntentHandler,
        RemindEmergencyOrdersIntentHandler,
        GetEmergencyOrdersIntentHandler,
        GetOrdersIntentHandler,
        LoginIntentHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistence.getPersistenceAdapter())
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();