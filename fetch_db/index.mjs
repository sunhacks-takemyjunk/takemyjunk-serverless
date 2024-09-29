import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, UpdateCommand, DeleteCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
    const method = event.httpMethod;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({}),
        };
    }

    if (method === 'GET') {
        const tableName = event.queryStringParameters.tableName;
        const encodedKey = event.queryStringParameters.key;
        const target = event.queryStringParameters.desired;

        if (encodedKey) {
            // Decode the key
            const decodedKey = decodeURIComponent(encodedKey);

            // Extract key-value pairs from the decoded key
            const keyPairs = decodedKey.split(',').filter(pair => pair.includes(':')).map(pair => pair.split(':'));
            const key = {};
            keyPairs.forEach(([k, v]) => {
                key[k] = isNaN(v) ? v : Number(v); // Convert to number if possible
            });

            if (key.email && key.password) {
                // Query by GSI (email and password)
                const email = key.email;
                const password = key.password;

                const params = {
                    TableName: tableName,
                    IndexName: 'email-password-index', // Use the GSI
                    KeyConditionExpression: 'email = :email AND password = :password',
                    ExpressionAttributeValues: {
                        ':email': email,
                        ':password': password
                    },
                    ProjectionExpression: target // Example: 'userID'
                };

                try {
                    const data = await client.send(new QueryCommand(params));
                    return {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({ message: 'Data retrieved successfully', data: data.Items })
                    };
                } catch (error) {
                    return {
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ message: 'Error retrieving data', error: error.message })
                    };
                }
            } else if (key.userID) {
                // Query by primary key (userID)
                const params = {
                    TableName: tableName,
                    Key: { userID: key.userID },
                    ProjectionExpression: target // Example: 'balance'
                };

                try {
                    const data = await client.send(new GetCommand(params));
                    return {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({ message: 'Data retrieved successfully', data: data.Item })
                    };
                } catch (error) {
                    return {
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ message: 'Error retrieving data', error: error.message, params: params
                        })
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ message: 'Invalid key format. Provide either userID or both email and password.' })
                };
            }
        } else {
            const params = {
                TableName: tableName,
                ProjectionExpression: target // Example: 'listID, img_url, item_info, item_name, item_price'
            };

            try {
                const data = await client.send(new ScanCommand(params));
                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({ message: 'Data retrieved successfully', data: data.Items })
                };
            } catch (error) {
                return {
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ message: 'Error retrieving data', error: error.message })
                };
            }
        }
    }

    if (method === 'PUT') {
        const requestBody = JSON.parse(event.body);
        const tableName = requestBody.tableName;
        const keyParam = requestBody.key;
        const target = requestBody.target;
        const data = requestBody.data;

        // Handle both single value and comma-separated list for key
        const key = {};
        if (keyParam.includes(',')) {
            const keyPairs = keyParam.split(',').map(pair => pair.split(':'));
            keyPairs.forEach(([k, v]) => {
                key[k] = isNaN(v) ? v : Number(v); // Convert to number if possible
            });
        } else {
            const [k, v] = keyParam.split(':');
            key[k] = isNaN(v) ? v : Number(v); // Convert to number if possible
        }

        // Handle both single value and comma-separated list for target
        const targetAttributes = target.includes(',') ? target.split(',').map(attr => attr.trim()) : [target];

        if (targetAttributes.length !== data.length) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ message: 'Target and data must have the same number of arguments' })
            };
        }

        let updateExpression = 'SET ';
        const expressionAttributeValues = {};
        targetAttributes.forEach((attr, index) => {
            updateExpression += `${attr} = :val${index}, `;
            expressionAttributeValues[`:val${index}`] = data[index];
        });
        updateExpression = updateExpression.slice(0, -2);

        const params = {
            TableName: tableName,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues
        };

        try {
            await client.send(new UpdateCommand(params));
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: 'Update successful' })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ message: 'Error updating data', error: error.message })
            };
        }
    }

    if (method === 'POST') {
        const requestBody = JSON.parse(event.body);
        const tableName = requestBody.tableName;
        const item = requestBody.item;

        // Ensure userID and listID are numbers if they exist
        if (item.userID) {
            item.userID = Number(item.userID);
        }
        if (item.listID) {
            item.listID = Number(item.listID);
        }

        const params = {
            TableName: tableName,
            Item: item
        };

        try {
            await client.send(new PutCommand(params));
            return {
                statusCode: 201,
                headers: headers,
                body: JSON.stringify({ message: 'Item created successfully' })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ message: 'Error creating item', error: error.message })
            };
        }
    }

    if (method === 'DELETE') {
        const tableName = event.queryStringParameters.tableName;
        const keyParam = event.queryStringParameters.key;

        // Handle both single value and comma-separated list for key
        const key = {};
        if (keyParam.includes(',')) {
            const keyPairs = keyParam.split(',').map(pair => pair.split(':'));
            keyPairs.forEach(([k, v]) => {
                key[k] = isNaN(v) ? v : Number(v); // Convert to number if possible
            });
        } else {
            const [k, v] = keyParam.split(':');
            key[k] = isNaN(v) ? v : Number(v); // Convert to number if possible
        }

        const params = {
            TableName: tableName,
            Key: key
        };

        try {
            await client.send(new DeleteCommand(params));
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: 'Delete successful' })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ message: 'Error deleting data', error: error.message })
            };
        }
    }

    return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ message: 'Unsupported method' })
    };
};