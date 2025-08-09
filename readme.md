# ShelfSync
[![Hosted on Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7?logo=render&logoColor=white)](https://ShelfSync.onrender.com)


ShelfSync is a full-stack digital commerce platform designed to connect local businesses with customers. It provides a seamless interface for stores to register their business, manage inventory, and track sales, while offering customers a centralized marketplace to discover local stores and purchase products.

The platform uniquely leverages web scraping with Puppeteer to automatically fetch and display store details from Google Maps during registration, simplifying the onboarding process for business owners.

## Try ShelfSync Out!
[https://ShelfSync.onrender.com](https://ShelfSync.onrender.com)



## Key Features

-   **Dual User System**: Separate registration, login, and dashboard experiences for both Customers and Stores.
-   **Automated Store Onboarding**: Stores can register simply by providing their Google Maps URL. The backend automatically scrapes essential details like store name, address, and rating.
-   **Customer Dashboard**: Customers can browse a list of all registered stores, search by name or location, and view store details before visiting their dedicated page.
-   **Store Dashboard**: A comprehensive dashboard for store owners to:
    -   Add, update, and manage product inventory.
    -   View a live feed of customer orders and sales history.
    -   Track total revenue and stock overview.
-   **Public Store Pages**: Each registered store has a dedicated public page where customers can view their available products.
-   **Shopping Cart System**: Customers can add multiple items from a single store to their cart and proceed with a unified checkout.
-   **Real-time Inventory & Order Processing**:
    -   Inventory is managed in real-time using Firebase Firestore.
    -   Purchases automatically decrement stock levels.
    -   All transactions are logged to a local file (`db/purchases.txt`) for historical reference.
-   **Secure Authentication**: A robust authentication flow using cookies ensures that users are correctly identified and directed to their appropriate dashboards.

## Tech Stack

-   **Backend**: Node.js, Express.js
-   **Database**: Google Firebase (Firestore) for user accounts and product inventory.
-   **Web Scraping**: Puppeteer for fetching store data from Google Maps.
-   **Frontend**: HTML, JavaScript, Tailwind CSS
-   **File System**: Node.js `fs` module for logging purchase transactions.
-   **Environment**: `dotenv` for managing environment variables.

## How It Works

1.  **Registration**: A user selects their account type: Customer or Store.
    -   **Stores** provide their Google Maps URL. The Node.js backend launches a headless Puppeteer instance to scrape the store's name, address, and rating.
    -   **Customers** register with standard credentials like username and email.
2.  **Data Storage**: User and store account information, along with product inventory, is stored and managed in a Firebase Firestore database.
3.  **Shopping Experience**:
    -   Customers log in to their dashboard to discover registered stores.
    -   They can visit a store's public page, which fetches product data from Firestore.
    -   Customers can add items to a client-side shopping cart.
4.  **Checkout & Order Handling**:
    -   When a customer checks out, the cart data is sent to the backend.
    -   The `/processCartPurchase` endpoint validates the order, updates the stock quantity in Firestore for each item, and records the sale by appending a new line to `db/purchases.txt`.
5.  **Dashboards**:
    -   The **Store Dashboard** fetches data from both Firestore (for stock levels) and the `purchases.txt` file (for order history).
    -   The **Customer Dashboard** fetches the list of stores by calling the `/getStores` endpoint.

## Setup and Installation

Follow these steps to run the project locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ritwik-sh/ShelfSync.git
    cd ShelfSync
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory of the project and add your Firebase project credentials. You can get these from your Firebase project settings.

    ```env
    firebaseAPI="YOUR_API_KEY"
    firebaseAuthDomain="YOUR_AUTH_DOMAIN"
    firebaseDatabaseURL="YOUR_DATABASE_URL"
    firebaseProjectId="YOUR_PROJECT_ID"
    firebaseStorageBucket="YOUR_STORAGE_BUCKET"
    firebaseMessagingSenderId="YOUR_MESSAGING_SENDER_ID"
    firebaseAppId="YOUR_APP_ID"
    firebaseMeasurementId="YOUR_MEASUREMENT_ID"
    ```

4.  **Run the application:**
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3000`.