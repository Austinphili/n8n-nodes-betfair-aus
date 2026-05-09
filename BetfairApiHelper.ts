import { NodeOperationError } from 'n8n-workflow';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const BETFAIR_API_LOGIN_URL = 'https://identitysso.betfair.com.au/api/login';
export const BETFAIR_API_BASE_URL_AU = 'https://api.betfair.com.au/exchange/betting/rest/v1.0/';

/**
 * Login to Betfair and return a session token.
 */
export async function betfairLogin(
	appKey: string,
	username: string,
	password: string,
	getNode: () => any,
): Promise<string> {
	const loginPayload = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
	try {
		const loginResponse = await axios.post(BETFAIR_API_LOGIN_URL, loginPayload, {
			headers: {
				'X-Application': appKey,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json',
			},
			timeout: 10000,
		});
		if (loginResponse.data?.token) {
			return loginResponse.data.token;
		}
		throw new NodeOperationError(
			getNode(),
			`Betfair login failed: ${loginResponse.data?.error || loginResponse.data?.loginStatus || 'No token received'}`,
		);
	} catch (error) {
		if (error instanceof NodeOperationError) throw error;
		if (axios.isAxiosError(error) && error.response) {
			throw new NodeOperationError(getNode(), `Betfair login API error: ${JSON.stringify(error.response.data)}`);
		}
		throw new NodeOperationError(getNode(), `Betfair login request error: ${(error as Error).message}`);
	}
}

/**
 * Make an authenticated POST request to a Betfair REST endpoint.
 */
export async function betfairApiRequest(
	endpoint: string,
	body: object,
	appKey: string,
	sessionToken: string,
	getNode: () => any,
): Promise<AxiosResponse> {
	const options: AxiosRequestConfig = {
		url: `${BETFAIR_API_BASE_URL_AU}${endpoint}`,
		method: 'POST',
		headers: {
			'X-Application': appKey,
			'X-Authentication': sessionToken,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		data: body,
		timeout: 15000,
	};
	try {
		return await axios(options);
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			console.error('Betfair API Error Response Data:', JSON.stringify(error.response.data, null, 2));
			throw new NodeOperationError(
				getNode(),
				`Betfair API Error: ${JSON.stringify(error.response.data)} (Status: ${error.response.status})`,
			);
		}
		throw new NodeOperationError(getNode(), `Betfair API Request Failed: ${(error as Error).message}`);
	}
}
