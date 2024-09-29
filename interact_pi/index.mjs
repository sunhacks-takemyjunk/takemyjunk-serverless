import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: "us-east-1" });

export const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: "CORS preflight response" })
        };
    }

    const action = event.queryStringParameters.action;

    const params = {
        Message: JSON.stringify({ action: action }), // 'open' or 'closed'
        TopicArn: "arn:aws:sns:us-east-1:122286528153:pi_tasks" // Replace with your SNS topic ARN
    };

    try {
        const data = await snsClient.send(new PublishCommand(params));
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: "Action published to SNS", data: data })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: "Error publishing action to SNS", error: error.message })
        };
    }
};