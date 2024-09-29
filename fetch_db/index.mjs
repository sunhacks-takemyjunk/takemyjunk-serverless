import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
    const method = event.httpMethod;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (method === 'GET') {
        const tableName = event.queryStringParameters.tableName;
        const key = JSON.parse(event.queryStringParameters.key); // Parse the key from JSON string
        if(key.userID) {
            key.userID = Number(key.userID); // Ensure userID is a number
        }
        if(key.listID) {
            key.listID = Number(key.listID); // Ensure listID is a number
        }
        const target = event.queryStringParameters.desired;

        const params = {
            TableName: tableName,
            Key: key, // Use the parsed key object
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
                body: JSON.stringify({ message: 'Error retrieving data', error: error.message })
            };
        }
    }

    if (method === 'PUT') {
        const requestBody = JSON.parse(event.body);
        const tableName = requestBody.tableName;
        const key = requestBody.key;
        key.userID = Number(key.userID); // Ensure userID is a number
        const target = requestBody.target;
        const data = requestBody.data;

        const targetAttributes = target.split(',').map(attr => attr.trim());

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
        const userID = Number(event.queryStringParameters.userID); // Ensure userID is a number
        const listID = event.queryStringParameters.listID;

        const key = { userID: userID };
        if (listID) {
            key.listID = Number(listID);
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