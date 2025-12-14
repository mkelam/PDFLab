import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-900">{statusCode || '?'}</h1>
        <p className="mt-4 text-xl text-gray-600">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
        >
          Go back home
        </a>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
