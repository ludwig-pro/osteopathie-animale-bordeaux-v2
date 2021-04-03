import React from "react"

export default function Contact({ id }) {
  return (
    <div id={id} className="relative bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gold-50"></div>
      </div>
      <div className="relative max-w-7xl mx-auto lg:grid lg:grid-cols-5">
        <div className="bg-gold-50 py-16 px-4 sm:px-6 lg:col-span-2 lg:px-8 lg:py-24 xl:pr-12">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-extrabold tracking-tight text-gold-500 sm:text-3xl">
              Horaires
            </h2>
            <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
              À domicile
            </h3>
            <p className="mt-2 text-lg leading-6 text-gray-500">
              <span className="font-bold">Lundi au Jeudi :</span> 09h à 19h
            </p>
            <p className="mt-2 text-lg leading-6 text-gray-500">
              <span className="font-bold">Samedi :</span> 09h à 14h
            </p>
            <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
              En cabinet
            </h3>
            <p className="mt-3 text-lg leading-6 text-gray-500">
              <span className="font-bold">Vendredi :</span> 10h à 19h
            </p>
            <dl className="mt-8 text-base text-gray-500">
              <a href="tel:+33665550792" className="text-gray-500">
                <div className="mt-6">
                  <dt className="sr-only">Téléphone</dt>
                  <dd className="flex">
                    <svg
                      className="flex-shrink-0 h-6 w-6 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="ml-3">0665550792</span>
                  </dd>
                </div>
              </a>
              <a
                href="mailto:agathe.lescout.osteo@gmail.com"
                className="text-gray-500"
              >
                <div className="mt-3">
                  <dt className="sr-only">Email</dt>
                  <dd className="flex">
                    <svg
                      className="flex-shrink-0 h-6 w-6 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="ml-3">agathe.lescout.osteo@gmail.com</span>
                  </dd>
                </div>
              </a>
            </dl>
          </div>
        </div>
        <div className="bg-white py-16 px-4 sm:px-6 lg:col-span-3 lg:py-24 lg:px-8 xl:pl-12">
          <div className="max-w-lg mx-auto lg:max-w-none">
            <form action="#" method="POST" className="grid grid-cols-1 gap-y-6">
              <div>
                <label for="full_name" className="sr-only">
                  Nom
                </label>
                <input
                  type="text"
                  name="full_name"
                  id="full_name"
                  autocomplete="name"
                  className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 focus:ring-gold-500 focus:border-gold-500 border-gray-300 rounded-md"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label for="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 focus:ring-gold-500 focus:border-gold-500 border-gray-300 rounded-md"
                  placeholder="Email"
                />
              </div>
              <div>
                <label for="phone" className="sr-only">
                  Téléphone
                </label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  autocomplete="tel"
                  className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 focus:ring-gold-500 focus:border-gold-500 border-gray-300 rounded-md"
                  placeholder="Phone"
                />
              </div>
              <div>
                <label for="message" className="sr-only">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 focus:ring-gold-500 focus:border-gold-500 border-gray-300 rounded-md"
                  placeholder="Message"
                ></textarea>
              </div>
              <div>
                <button
                  type="submit"
                  className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-gold-500 hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}