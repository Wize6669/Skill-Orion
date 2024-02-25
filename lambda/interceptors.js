const Alexa = require('ask-sdk-core');

module.exports = {
// This request interceptor will log all incoming requests to this lambda
LoggingRequestInterceptor : {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
},

// This response interceptor will log all outgoing responses of this lambda
LoggingResponseInterceptor : {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
},

LoadAttributesRequestInterceptor : {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        if (Alexa.isNewSession(requestEnvelope)){ //is this a new session? this check is not enough if using auto-delegate (more on next module)
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            console.log('Loading from persistent storage: ' + JSON.stringify(persistentAttributes));
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes); // ALL persistent attributtes are now session attributes
        }
    }
},

// If you disable the skill and reenable it the userId might change and you loose the persistent attributes saved below as userId is the primary key
SaveAttributesResponseInterceptor : {
    async process(handlerInput, response) {
        if (!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        if (shouldEndSession || Alexa.getRequestType(requestEnvelope) === 'SessionEndedRequest') { // skill was stopped or timed out
            // we make ALL session attributes persistent
            console.log('Saving to persistent storage:' + JSON.stringify(sessionAttributes));
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
},
}