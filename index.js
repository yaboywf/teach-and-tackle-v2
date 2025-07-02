const aws = require("aws-sdk");
const crypto = require('crypto');
const dynamo = new aws.DynamoDB.DocumentClient();
const cognito = new aws.CognitoIdentityServiceProvider();
const s3 = new aws.S3();

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

/**
 * Check required keys
 * 
 * @param {object} body - The request
 * @param {string[]} keys - An array of strings representing the required keys
*/
const checkRequiredKeys = (data, keys) => {
    if (!data) throw new HttpError(400, "Data is empty");
    if (typeof data !== 'object') throw new HttpError(400, `Data not an object. It is a ${typeof data}`);

    let missingKeys = keys.filter(key => !data.hasOwnProperty(key));
    if (missingKeys.length > 0) throw new HttpError(400, "Missing required keys: " + missingKeys.join(", "));
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
const decodeJWT = (token, callback) => {
    if (!token) return null;

    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
}

/**
 * Function to parse JSON
 * @param {*} data 
 * @returns {object}
 */
const parseJsonSafe = (data) => {
    try {
        return data && typeof data === 'string' ? JSON.parse(data) : data || {};
    } catch (err) {
        return {};
    }
};

/**
 * Function to handle errors
 * @param {*} err 
 * @param {*} callback 
 */
const handleError = (err, callback) => {
    console.error(err.message)

    callback(null, {
        statusCode: err instanceof HttpError ? err.statusCode : 500,
        body: JSON.stringify({ error: `Internal Server Error - ${err.message}` }),
    });
}

/**
 * Calculates the secret hash to be passed into AWS Cognito
 * 
 * @param {*} username - The username
 * @returns {string}
 */
async function calculateSecretHash(username) {
    const encoder = new TextEncoder();
    const data = `${username}2lave0d420lofl9ead9h87mi41`;
    const keyData = encoder.encode('kr3a1i8868lhcmmlain7jh10trjofrt4f2f4en2orh6oorbkp3t');
    const dataToSign = encoder.encode(data);

    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, dataToSign);
    const byteArray = new Uint8Array(signature);
    return btoa(String.fromCharCode.apply(null, byteArray));
}

/**
 * Handles the new password challenge
 * @param {*} session 
 * @param {*} username 
 * @param {*} newPassword 
 * @param {*} callback
 */
function handleNewPasswordChallenge(session, username, newPassword, callback) {
    calculateSecretHash(username)
        .then(secretHash => {
            const params = {
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                ClientId: '2lave0d420lofl9ead9h87mi41',  // Your App Client ID
                ChallengeResponses: {
                    USERNAME: username,
                    NEW_PASSWORD: newPassword,
                    SECRET_HASH: secretHash
                },
                Session: session,
            };

            cognito.respondToAuthChallenge(params, function (err, data) {
                if (err) throw new Error("Error responding to password change challenge:", err);

                if (data.AuthenticationResult) {
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.AuthenticationResult),
                    });
                }
            });
        })
        .catch(err => {
            callback(null, {
                statusCode: 500,
                body: JSON.stringify(err),
            });
        });
}

/**
 * Generic function to handle Cognito actions (signUp, forgotPassword, changePassword, etc.)
 * @param {*} action - The Cognito action to perform (signUp, forgotPassword, etc.)
 * @param {*} params - The parameters for the Cognito action
 * @param {*} callback - The callback function to return the response
 */
async function cognitoAction(action, params, callback, successMessage, needSecretHash = false, needClientId = false) {
    try {
        if (needSecretHash) params.SecretHash = await calculateSecretHash(params.Username);
        if (needClientId) params.ClientId = "2lave0d420lofl9ead9h87mi41";

        await cognito[action](params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ message: successMessage })
        });
    } catch (err) {
        throw new HttpError(500, err);
    }
}

exports.handler = async (event, context, callback) => {
    let jwt;
    let decoded;
    let userId;
    const body = parseJsonSafe(event.body)
    const query = parseJsonSafe(event.queryStringParameters);
    const auth = parseJsonSafe(event.headers);

    switch (event.routeKey) {
        case 'GET /api/account/account-information':
            try {
                checkRequiredKeys(query, ["id"]);

                var params = {
                    TableName: "users",
                    Key: {
                        student_id: body.id
                    }
                };

                var data = await dynamo.get(params).promise();

                if (!data.Item) throw new HttpError(404, "Student not found");

                if (data.Item.image_key) {
                    var getImageParams = {
                        Bucket: "teach-and-tackle-images",
                        Key: data.Item.image_key || ""
                    };

                    var imageData = await s3.getObject(getImageParams).promise();
                    var base64Image = imageData.Body.toString('base64');
                    data.Item.image = base64Image;
                }

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(data.Item)
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case 'PUT /api/account/update-account':
            try {
                checkRequiredKeys(body, ["diploma", "year_of_study"]);
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var params = {
                    TableName: "users",
                    Key: {
                        student_id: userId
                    },
                    UpdateExpression: "set #diploma = :diploma, #year_of_study = :year_of_study",
                    ExpressionAttributeNames: {
                        "#diploma": "diploma",
                        "#year_of_study": "year_of_study"
                    },
                    ExpressionAttributeValues: {
                        ":diploma": body.diploma,
                        ":year_of_study": Number(body.year_of_study)
                    },
                };

                await dynamo.update(params).promise();

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "User Information successfully updated" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case 'DELETE /api/account/delete-account':
            try {
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var getParams = {
                    TableName: "users",
                    Key: {
                        student_id: userId || ""
                    }
                };

                const data = await dynamo.get(getParams).promise();

                if (!data.Item) throw new HttpError(404, "User not found");

                if (data.Item.image_key) {
                    var getImageParams = {
                        Bucket: "teach-and-tackle-images",
                        Key: data.Item.image_key || ""
                    };

                    await s3.deleteObject(getImageParams).promise();
                }

                var deleteParams = {
                    TableName: "users",
                    Key: {
                        student_id: userId || ""
                    }
                };

                await dynamo.delete(deleteParams).promise();

                var cognitoDeleteParams = {
                    UserPoolId: "us-east-1_RP5a0BedE",
                    Username: userId.toUpperCase(),
                };

                await cognito.adminDeleteUser(cognitoDeleteParams).promise();

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: `User ${userId} deleted` }),
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/account/authenticate":
            try {
                checkRequiredKeys(body, ["username", "password"]);

                var secretHash = await calculateSecretHash(body.username)

                var loginParams = {
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    ClientId: '2lave0d420lofl9ead9h87mi41',
                    AuthParameters: {
                        USERNAME: body.username,
                        PASSWORD: body.password,
                        SECRET_HASH: secretHash
                    }
                };

                var loginData = await cognito.initiateAuth(loginParams).promise();

                if (loginData.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                    handleNewPasswordChallenge(loginData.Session, body.username, body.password, callback);
                } else {
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(loginData.AuthenticationResult),
                    });
                }
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/account/register":
            try {
                checkRequiredKeys(body, ["student_id", "name", "diploma", "year_of_study", "password"]);

                var getParams = {
                    TableName: "users",
                    Key: {
                        student_id: body.student_id
                    }
                };

                var data = await dynamo.get(getParams).promise();

                if (data.Item) throw new HttpError(400, "User already exists");

                var postParams = {
                    TableName: "users",
                    Item: {
                        student_id: body.student_id || "",
                        name: body.name || "",
                        year_of_study: Number(body.year_of_study) || 0,
                        diploma: body.diploma || "",
                    }
                };

                await dynamo.put(postParams).promise();

                var cognitoSignUpParams = {
                    Username: body.student_id.toUpperCase(),
                    Password: body.password,
                    UserAttributes: [
                        { Name: 'name', Value: body.name },
                        { Name: 'email', Value: "dylanyeowf@gmail.com" },
                        // Uncomment in production
                        // { Name: 'email', Value: `${body.student_id.toUpperCase()}@student.tp.edu.sg` }
                    ]
                };

                await cognitoAction("signUp", cognitoSignUpParams, callback, "User successfully registered", true, true);
            } catch (e) {
                handleError(e, callback);
            }

            break;
        case "POST /api/account/forget-password":
            try {
                checkRequiredKeys(body, ["username"]);
                await cognitoAction("forgotPassword", { Username: body.username }, callback, "Password reset code sent successfully", true, true);
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/account/reset-password":
            try {
                checkRequiredKeys(body, ["current_password", "new_password"]);
                checkRequiredKeys(auth, ["authorization"]);
                await cognitoAction("changePassword", { AccessToken: auth.authorization, PreviousPassword: body.current_password, ProposedPassword: body.new_password }, callback, "Password changed successfully");
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/account/confirm-email":
            try {
                checkRequiredKeys(body, ["username", "code"]);
                await cognitoAction("confirmSignUp", { Username: body.username.toUpperCase(), ConfirmationCode: body.code }, callback, "Email Confirmed", true, true);
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/account/confirm-password":
            try {
                checkRequiredKeys(body, ["username", "code", "password"]);
                await cognitoAction("confirmForgotPassword", { Username: body.username, ConfirmationCode: body.code, Password: body.password }, callback, "Password Reset", true, true);
            } catch (err) {
                handleError(err, callback);
            }

            break;
        default:
            try {
                if (!event.routeKey) throw new HttpError(400, "No routeKey provided");
                if (!event.routeKey.includes('/api/account')) throw new HttpError("This function only supports CRUD of accounts, where the routeKey starts with /api/account/* routes")
                throw new HttpError(404, `Unsupported route: "${event.routeKey}"`);
            } catch (err) {
                handleError(err, callback);
            }
    }
}