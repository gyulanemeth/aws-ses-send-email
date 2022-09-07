import nodemailer from 'nodemailer'
import aws from '@aws-sdk/client-ses'
import createTextVersion from 'textversionjs'

import { ValidationError, InternalServerError } from 'standard-api-errors'

/*
  Add the following to your .env file:
    FROM_EMAIL_ADDRESS
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
*/

export default async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      throw new ValidationError('Missing params: to, subject and html are required.')
    }
    let transporter
    /* istanbul ignore else */
    if (process.env.NODE_ENV === 'test') {
      const testAccount = await nodemailer.createTestAccount()
      transporter = await nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      })
    } else {
      if (!process.env.FROM_EMAIL_ADDRESS) {
        throw new InternalServerError('Missing environment variable: FROM_EMAIL_ADDRESS')
      }
      if (!process.env.AWS_ACCESS_KEY_ID) {
        throw new InternalServerError('Missing environment variable: AWS_ACCESS_KEY_ID')
      }
      if (!process.env.AWS_SECRET_ACCESS_KEY) {
        throw new InternalServerError('Missing environment variable: AWS_SECRET_ACCESS_KEY')
      }
      const sesClient = new aws.SESClient({
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      })
      transporter = nodemailer.createTransport({
        SES: { ses: sesClient, aws }
      })
    }
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL_ADDRESS,
      to,
      subject,
      html,
      text: createTextVersion(html)
    })
    return {
      status: 200,
      result: {
        info
      }
    }
  } catch (err) {
    if (err.name !== 'VALIDATION_ERROR' && err.name !== 'INTERNAL_SERVER_ERROR') {
      throw new InternalServerError(`Email sending error: ${err.message}`)
    }
    throw err
  }
}
