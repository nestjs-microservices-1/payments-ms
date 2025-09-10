import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  STRIPE_SECRET_KEY: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_CANCEL_URL: string;
  STRIPE_ENDPOINT_SECRET: string;
}
const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    STRIPE_SECRET_KEY: joi.string().required(),
    STRIPE_SUCCESS_URL: joi.string().required(),
    STRIPE_CANCEL_URL: joi.string().required(),
    STRIPE_ENDPOINT_SECRET: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}
const envVars: EnvVars = value;

export const envs = {
  PORT: envVars.PORT || 3000,
  STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY,
  STRIPE_SUCCESS_URL: envVars.STRIPE_SUCCESS_URL,
  STRIPE_CANCEL_URL: envVars.STRIPE_CANCEL_URL,
  STRIPE_ENDPOINT_SECRET: envVars.STRIPE_ENDPOINT_SECRET,
};
