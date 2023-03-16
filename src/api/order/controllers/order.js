"use strict";
const stripe = require("stripe")(sk_test_51MeKA0Ao8puVP1WfxdlT8TEJRWccDzcPdzlStBXdbrdWq56DSeFD21Op1tOtPPlKqMuZYabosJgpI5DdOXr253PK00kjzDJiyx);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, userName, email } = ctx.request.body;
    try {
      // retrieve item information
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          return {
            price_data: {
              currency: "gbp",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });
      
      console.log("Session ID:", session.id);
      
      await strapi
        .service("api::order.order")
        .create({ data: {email, userName, products, stripeSessionId: session.id } });
      
      console.log("Order created successfully");
      
      // return the session id
      return { stripeSessionId: session.id };
    } catch (error) {
      ctx.response.status = 500;
      return { error: { message: "There was a problem creating the charge" } };
    }
  },
}));
