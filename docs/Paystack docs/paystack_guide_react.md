Accept Payments on your React App
In a nutshell

Need to start accepting payments through your React app? In this article, we'll be exploring how to connect Paystack with your React app. We'll be using a sample checkout page on an e-commerce store for our demo
Introduction
Before you begin

You should create a free Paystack account which will give you access to your unique test key to test your integration.

We're going to use our public keys for this demo. To get your public key, login into your Paystack dashboard and click on the Settings tab, and then click on API Keys & Webhooks.

You'll notice you have two public keys: Test and Live. While building your app, it's a good idea to use your test keys, as this will allow you to simulate transactions. Once your app is production-ready, you can switch over to your live keys.
Never use secret keys on client-side

Since this is a client-side integration, it means that our API keys will be exposed. To prevent anyone gaining access to our Paystack account, we want to make sure we're using our public keys. Secret keys should only ever be used on the server.
Project Setup

So, let's get to coding! To start off, I'm going to create a new react app. I like to use yarn to get started with my react apps, but you're welcome to use npm or npx.

yarn create react-app react-paystack-checkout

Once our app is created, we'll need to navigate into our app's directory and start our app:

cd react-paystack-checkout

yarn start

Let's take a moment and add the UI for our checkout page.

<div className="App">

  <div className="container">

    <div className="item">

      <div className="overlay-effect"></div>

      <img

        className="item-image"

        src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80"

        alt="product"

      />

      <div className="item-details">

        <p className="item-details__title">Coconut Oil</p>

        <p className="item-details__amount">NGN{amount / 100}</p>

      </div>

    </div>

    <div className="checkout">

      <div className="checkout-form">

        <div className="checkout-field">

          <label>Name</label>

          <input/>

        </div>

        <div className="checkout-field">

          <label>Email</label>

          <input/>

        </div>

        <div className="checkout-field">

          <label>Phone</label>

          <input/>

        </div>

      </div>

    </div>

  </div>

</div>

Now you should be able to see our beautiful product display in your browser! For the product we're selling, I just grabbed this cool image of a bottle of Coconut oil from Unsplash. I've also hardcoded a product name, and set up our amount to be pulled in later.

Wondering why we're dividing our amount by 100? When calling the Paystack API, you'll want to pass the amount in the smallest currency denomination available. We're selling our product for NGN 10,000, which is 1,000,000 kobo. We don't want to show our customers prices in kobo though, so we divide by 100 to get the Naira equivalent.
Install Paystack

But our form isn't functional yet. We need to add some logic that will submit our customer's data and initialize a transaction on Paystack. Let's install the react-paystack library:

yarn add react-paystack

Once the library installs successfully, we can add some variables to hold state and a function to handle the state changes. I'll explain the variables we're passing and what they're for in a little bit. For now we'll just add them and hardcode our publicKey and product amount, since they won't be changing.

const publicKey = "pk_your_public_key_here"

  const amount = 1000000 // Remember, set in kobo!

  const [email, setEmail] = useState("")

  const [name, setName] = useState("")

  const [phone, setPhone] = useState("")


...


<div className="checkout-form">

  <div className="checkout-field">

    <label>Name</label>

    <input

      type="text"

      id="name"

      onChange={(e) => setName(e.target.value)}

    />

  </div>

  <div className="checkout-field">

    <label>Email</label>

    <input

      type="text"

      id="email"

      onChange={(e) => setEmail(e.target.value)}

    />

  </div>

  <div className="checkout-field">

    <label>Phone</label>

    <input

      type="text"

      id="phone"

      onChange={(e) => setPhone(e.target.value)}

    />

  </div>

  <PaystackButton className="paystack-button" {...componentProps} />

</div>

Accept Payments

The last thing we'll need to do here is submit the form to Paystack, so we can initialize a transaction. There are three different ways we can use the react-paystack library in our app:

    PaystackButton - The original library implementation
    usePaystackPayment - An implementation of the library using React Hooks
    PaystackConsumer - An implementation of the library using React's Context API

Let's use the PaystackButton implementation for our app:

import { PaystackButton } from 'react-paystack'

There are a few parameters we can pass to the button, but the required ones are:

    email - All transactions on Paystack require a customer's email address
    amount - The amount we're charging the customer
    publicKey - Remember, public keys for client-side code always
    text - The text you want displayed on your button
    onSuccess - A function that will run after a successful transaction is completed
    onClose - A function that will run when the customer closes the Paystack Checkout

Optionally, we can pass a transaction reference and a metadata object. If you don't pass a reference, Paystack will just generate one for you. If you choose to generate your own references, you'll need to make sure that every reference is unique. The metadata object lets you store any additional information you would like to for a transaction. Here, we'll be passing the customer's name and phone number in our metadata. We'll put all of this in a componentProps object that we'll pass to the PaystackButton component.

const componentProps = {

    email,

    amount,

    metadata: {

      name,

      phone,

    },

    publicKey,

    text: "Pay Now",

    onSuccess: () =>

      alert("Thanks for doing business with us! Come back soon!!"),

    onClose: () => alert("Wait! You need this oil, don't go!!!!"),

  }

Our App.js file should now look like this

import React, { useState } from "react"

import { PaystackButton } from "react-paystack"

import "./App.css"


const App = () => {

  const publicKey = "pk_your_public_key_here"

  const amount = 1000000

  const [email, setEmail] = useState("")

  const [name, setName] = useState("")

  const [phone, setPhone] = useState("")


  const componentProps = {

    email,

    amount,

    metadata: {

      name,

      phone,

    },

    publicKey,

    text: "Pay Now",

    onSuccess: () =>

      alert("Thanks for doing business with us! Come back soon!!"),

    onClose: () => alert("Wait! Don't leave :("),

  }


  return (

    <div className="App">

      <div className="container">

        <div className="item">

          <img />

          <div className="item-details">

            <p>Dancing Shoes</p>

            <p>{amount}</p>

          </div>

        </div>

        <div className="checkout-form">

          <form>

            <label>Name</label>

            <input

              type="text"

              id="name"

              onChange={(e) => setName(e.target.value)}

            />

            <label>Email</label>

            <input

              type="text"

              id="email"

              onChange={(e) => setEmail(e.target.value)}

            />

            <label>Phone</label>

            <input

              type="text"

              id="phone"

              onChange={(e) => setPhone(e.target.value)}

            />

          </form>

          <PaystackButton {...componentProps} />

        </div>

      </div>

    </div>

  )

}


export default App

We can switch back over to the browser now and test our app out! But before we do that, let's add some styles so people will actually want to buy our coconut oil.

@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;1,300&display=swap");


.App {

  text-align: center;

  font-family: "Roboto";

  letter-spacing: 0.1rem;

}


.container {

  display: flex;

  flex-direction: row;

  margin: 5% auto;

  width: 635px;

  height: 430px;

  background: white;

  box-shadow: 0px 0px 50px rgba(0, 0, 0, 0.5);

}


.item {

  width: 50%;

  position: relative;

}


.item-image {

  height: 430px;

  width: 100%;

  object-fit: cover;

}


.overlay-effect {

  position: absolute;

  top: 0;

  bottom: 0;

  left: 0;

  right: 0;

  opacity: 0.2;

  background-color: #303030;

  overflow: hidden;

  z-index: 1;

}


.item-details {

  position: absolute;

  bottom: 0;

  margin-bottom: 5px;

  margin-left: 20px;

  color: #84a17d;

  text-align: left;

}


.item-details__title {

  font-size: 22px;

}


.item-details__amount {

  font-weight: bolder;

}


.checkout {

  background: #84a17d; /* fallback for old browsers */


  display: flex;

  flex-direction: column;

  justify-content: center;

  height: 430px;

  width: 50%;

}


.checkout-form {

  padding: 20px 20px;

}


.checkout-field {

  display: flex;

  flex-direction: column;

  margin-bottom: 20px;

}


.checkout-field label {

  text-align: left;

  color: #e0eafc;

  font-size: 10px;

  margin-bottom: 5px;

  text-transform: uppercase;

  letter-spacing: 0.1rem;

}


.checkout-field input {

  background-color: transparent;

  border: 1px solid #cecece;

  border-radius: 5px;

  color: #e0eafc;

  height: 35px;

}


.paystack-button {

  cursor: pointer;

  text-align: center;

  font-size: 10px;

  letter-spacing: 0.1rem;

  text-transform: uppercase;

  background-color: #bfbfbf;

  font-weight: bold;

  color: #e0eafc;

  border: none;

  border-radius: 5px;

  width: 100%;

  height: 45px;

  margin-top: 40px;

}

Switch over to your browser and you should see a much more appealing product display. Now we can make lots of money on our NGN 10,000 bottles of coconut oil 😅

The full code sample is in this repository and you can check out the live demo.