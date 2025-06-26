const aws = require("aws-sdk");
const crypto = require('crypto');
const dynamo = new aws.DynamoDB.DocumentClient();
const cognito = new aws.CognitoIdentityServiceProvider();

/**
 * Check required keys
 * 
 * @param {object} body - The request
 * @param {string[]} keys - An array of strings representing the required keys
 * @param {function} callback - The callback function
*/
const checkRequiredKeys = (body, keys, callback) => {
    try {
        if (!body) {
            throw new Error("Body is empty");
        }

        if (typeof body !== 'object') {
            throw new Error(`Body not an object. It is a ${typeof body}`);
        }

        let missingKeys = keys.filter(key => !body.hasOwnProperty(key));
        if (missingKeys.length > 0) {
            callback(null, {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required keys: " + missingKeys.join(", ") })
            });
        }
    } catch (e) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to check required keys: ${e.message}` })
        });
    }
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
const decodeJWT = (token, callback) => {
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to decode JWT: ${e.message}` })
        });
        return null;
    }
}

/**
 * Calculates the secret hash to be passed into AWS Cognito
 * 
 * @param {*} username - The username
 * @returns 
 */
function calculateSecretHash(username) {
    const encoder = new TextEncoder();
    const data = `${username}2lave0d420lofl9ead9h87mi41`;
    const keyData = encoder.encode('kr3a1i8868lhcmmlain7jh10trjofrt4f2f4en2orh6oorbkp3t');
    const dataToSign = encoder.encode(data);

    return crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: { name: "SHA-256" } },
        false,
        ["sign"]
    )
        .then(function (key) {
            return crypto.subtle.sign("HMAC", key, dataToSign)
                .then(function (signature) {
                    // Convert signature to base64 format
                    const byteArray = new Uint8Array(signature);
                    return btoa(String.fromCharCode.apply(null, byteArray));
                });
        });
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
 * Function to trigger the forget password flow
 * @param {*} username 
 */
async function forgotPassword(username, callback) {
    const secretHash = await calculateSecretHash(username);
    const params = {
        ClientId: '2lave0d420lofl9ead9h87mi41',
        SecretHash: secretHash,
        Username: username,
    };

    try {
        await cognito.forgotPassword(params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ message: "Password reset code sent successfully" })
        });
    } catch (err) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err)
        });
    }
}

/**
 * Function to change password
 * @param {*} currentPassword 
 * @param {*} newPassword 
 */
async function changePassword(currentPassword, newPassword, accessToken, callback) {
    const params = {
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword
    };

    try {
        await cognito.changePassword(params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ "message": "Password changed successfully" })
        });
        isFormDirty = false;
    } catch (error) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(error)
        });
    }
}

/**
 * Function to register in AWS Cognito
 * @param {*} adminNumber 
 * @param {*} name 
 * @param {*} password 
 */
async function signUp(adminNumber, name, password, callback) {
    try {
        const secretHash = await calculateSecretHash(adminNumber);
        const params = {
            ClientId: "2lave0d420lofl9ead9h87mi41",
            SecretHash: secretHash,
            Username: adminNumber.toUpperCase(),
            Password: password,
            UserAttributes: [
                { Name: 'name', Value: name },
                { Name: 'email', Value: "dylanyeowf@gmail.com" },
                // Uncomment in production
                // { Name: 'email', Value: `${adminNumber.toUpperCase()}@student.tp.edu.sg` }
            ]
        };


        await cognito.signUp(params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ "message": "User successfully registered" })
        });
    } catch (err) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err)
        });
    };
}

/**
 * Function to confirm email
 * @param {*} confirmationCode 
 */
async function confirmEmail(adminNumber, confirmationCode, callback) {
    try {
        const secretHash = await calculateSecretHash(adminNumber);
        const params = {
            ClientId: "2lave0d420lofl9ead9h87mi41",
            SecretHash: secretHash,
            Username: adminNumber.toUpperCase(),
            ConfirmationCode: confirmationCode
        };

        await cognito.confirmSignUp(params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ "message": "Email Confirmed" })
        });
    } catch (err) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err)
        });
    }
}

/**
 * Function to create a new password during the forget password flow
 * @param {*} verificationCode 
 * @param {*} newPassword 
 * @param {*} adminNumber
 */
async function confirmForgotPassword(verificationCode, adminNumber, newPassword, callback) {
    const secretHash = await calculateSecretHash(adminNumber);
    const params = {
        ClientId: '2lave0d420lofl9ead9h87mi41',
        SecretHash: secretHash,
        Username: adminNumber,
        ConfirmationCode: verificationCode,
        Password: newPassword,
    };

    try {
        await cognito.confirmForgotPassword(params).promise();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ "message": "Password Reset" })
        });
    } catch (err) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err)
        });
    }
}

exports.handler = (event, context, callback) => {
    let body;
    let jwt;
    let decoded;
    let userId;
    const auth = event.headers;

    switch (event.routeKey) {
        case 'GET /api/account/account-information':
            try {
                body = event.queryStringParameters;

                checkRequiredKeys(body, ["id"], callback);

                var params = {
                    TableName: "users",
                    Key: {
                        student_id: body.id
                    }
                };

                dynamo.get(params, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Item) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Student not found" })
                        });
                        return;
                    }

                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.Item)
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'PUT /api/account/update-account':
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["diploma", "year_of_study"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

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

                dynamo.update(params, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify({ message: "User Information successfully updated" })
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'DELETE /api/account/delete-account':
            try {
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var deleteParams = {
                    TableName: "users",
                    Key: {
                        student_id: userId || ""
                    }
                };

                dynamo.delete(deleteParams, (err, data) => {
                    if (err) {
                        console.error("DynamoDB delete error:", err);
                        return callback(null, {
                            statusCode: 500,
                            body: JSON.stringify({ message: "Failed to delete user data" })
                        });
                    }

                    const params = {
                        UserPoolId: "us-east-1_RP5a0BedE",
                        Username: userId.toUpperCase(),
                    };

                    cognito.adminDeleteUser(params).promise()
                        .then(() => {
                            callback(null, {
                                statusCode: 200,
                                body: JSON.stringify({ message: `User ${userId} deleted` }),
                            });
                        })
                        .catch(err => {
                            console.error("Cognito delete error:", err);
                            callback(null, {
                                statusCode: err.statusCode || 500,
                                body: JSON.stringify({ message: err.message || "Failed to delete user" }),
                            });
                        });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err)
                });
            }

            break;
        case "POST /api/account/authenticate":
            body = event.body;

            if (typeof body === "string") body = JSON.parse(body);

            checkRequiredKeys(body, ["username", "password"], callback);

            calculateSecretHash(body.username)
                .then(secretHash => {
                    const params = {
                        AuthFlow: 'USER_PASSWORD_AUTH',
                        ClientId: '2lave0d420lofl9ead9h87mi41',  // Your App Client ID
                        AuthParameters: {
                            USERNAME: body.username,
                            PASSWORD: body.password,
                            SECRET_HASH: secretHash
                        }
                    };

                    cognito.initiateAuth(params, (err, data) => {
                        if (err) throw new Error("Error initiating auth:", err);

                        if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                            handleNewPasswordChallenge(data.Session, body.username, body.password, callback);
                        } else {
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

            break;
        case "POST /api/account/register":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["student_id", "name", "diploma", "year_of_study", "password"], callback);

                var getParams = {
                    TableName: "users",
                    Key: {
                        student_id: body.student_id
                    }
                };

                dynamo.get(getParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (data.Item) {
                        callback(null, {
                            statusCode: 400,
                            body: JSON.stringify({ error: "User already exists" })
                        });
                        return;
                    }

                    var postParams = {
                        TableName: "users",
                        Item: {
                            student_id: body.student_id || "",
                            name: body.name || "",
                            year_of_study: Number(body.year_of_study) || 0,
                            diploma: body.diploma || "",
                        }
                    };

                    dynamo.put(postParams, (err, data) => {
                        if (err) throw new Error(err)

                        signUp(body.student_id, body.name, body.password, callback);
                    });
                });
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify({ error: e })
                });
            }

            break;
        case "POST /api/account/forget-password":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["username"], callback);

                forgotPassword(body.username, callback);
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err)
                });
            }

            break;
        case "POST /api/account/reset-password":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["current_password", "new_password"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                changePassword(body.current_password, body.new_password, auth.authorization, callback);
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err)
                });
            }

            break;
        case "POST /api/account/confirm-email":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["username", "code"], callback);

                confirmEmail(body.username, body.code, callback);

                break;
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err)
                });
            }

            break;
        case "POST /api/account/confirm-password":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["username", "code", "password"], callback);

                confirmForgotPassword(body.code, body.username, body.password, callback);
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err)
                });
            }

            break;
        default:
            if (!event.routeKey) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Missing routeKey" })
                });
                return;
            }

            if (!event.routeKey.includes('/api/account')) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "This function only supports CRUD of accounts, where the routeKey starts with /api/account/* routes" })
                });
                return;
            }

            callback(null, {
                statusCode: 404,
                body: JSON.stringify({ error: `Unsupported route: "${event.routeKey}"` })
            });
    }
}