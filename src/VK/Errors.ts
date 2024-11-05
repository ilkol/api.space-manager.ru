export interface VKRequestParam
{
	key: string;
	value: string;
}

export interface VKError
{
	error_code: number;
	error_msg: string;
	request_params: VKRequestParam[]
}
