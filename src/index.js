import nodemailer from 'nodemailer'
import aws from '@aws-sdk/client-ses'
import createTextVersion from 'textversionjs'

import { ValidationError } from 'standard-api-errors'

/*
  Add the following to your .env file:
    FROM_EMAIL_ADDRESS
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
*/

export default async ({ to, subject, html }) => {
  try {
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
    }).then(res => res)
    return {
      status: 200,
      result: {
        info
      }
    }
  } catch (err) {
    return new ValidationError('Check your sending to field')
  }
}
