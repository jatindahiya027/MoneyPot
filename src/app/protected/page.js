"use client";
import { useState, useEffect } from "react";
import Cookies from "universal-cookie";
import React from "react";
import Image from "next/image";
import Dashboard from "./dashboard";
import Transfers from "./transfers";
import Categories from "./categories";
const cookies = new Cookies();
export default function Board() {
  const [activeComponent, setActiveComponent] = useState("component1");
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transtables, setTranstable] = useState([]);
  const [category, setCategory] = useState([]);
  const [catamount, setCatamount] = useState([]);
  const [creditdebit, setCreditdebit] = useState([]);
console.log("inside dashboardpage");
  const endpoints = [
    { url: '/api/get', setState: setItems },
    { url: '/api/transactions', setState: setTransactions },
    { url: '/api/category', setState: setCategory },
    { url: '/api/cattotal', setState: setCatamount },
    { url: '/api/creditdebit', setState: setCreditdebit },
    { url: '/api/transtable', setState: setTranstable },
  ];

  useEffect(() => {
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      return;
    }

    endpoints.forEach(({ url, setState }) => {
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      })
        .then((res) => res.json())
        .then((data) => setState(data))
        .catch((error) => console.error(`Error fetching data from ${url}:`, error));
    });
  }, []);
  const renderComponent = () => {
    switch (activeComponent) {
      case "component1":
        return <Dashboard trans={transactions} cate={category} catamount={catamount} user={items} creditdebit={creditdebit} transtables={transtables}/>;
      case "component2":
        return <Transfers trans={transactions} cate={category}/>;
      case "component3":
        return <Categories  />;
      // case 'component4':
      //   return <Login />;
      default:
        return <Dashboard trans={transactions} cate={category} catamount={catamount} user={items} creditdebit={creditdebit} transtables={transtables}/>;
    }
  };
  return (
    <div className="wrapper">
      {/* {items.map((item, index) => (
          <div key={index}>{item.name}
          <h2>{item.name}</h2>
          <p>{item.age}</p>
          <p>{item.mail}</p>
          </div>
        ))} */}
        {/* {
           creditdebit.map((item, index) => (
            <div key={index}>
              <h2>{item.type}</h2>
             
              <p>{item.amount}</p>
              <p>{item.fill}</p>
            </div>
          ))
        } */}
      <div className="types">
        <div className="heading">
          <Image alt="image" src="/logo.png"  height={50} width={50} />
          <h1 className="headname">MoneyPot</h1>
        </div>
        <div className="spacemaker">
          <button
            className={`button ${
              activeComponent === "component1" ? "active" : ""
            }`}
            onClick={() => setActiveComponent("component1")}
          >
            <Image alt="image" src="/dashboards.png"  height={20} width={20} />
            <p>Dashboard</p>
          </button>
          <button
            className={`button ${
              activeComponent === "component2" ? "active" : ""
            }`}
            onClick={() => setActiveComponent("component2")}
          >
            <Image alt="image"
              src="/data-transfer.png"
              
              height={20}
              width={20}
            />
            <p>Transfers</p>
          </button>
          <button
            className={`button ${
              activeComponent === "component3" ? "active" : ""
            }`}
            onClick={() => setActiveComponent("component3")}
          >
            <Image alt="image" src="/menu.png"  height={20} width={20} />
            <p>Categories</p>
          </button>
          <button
            className={`button ${
              activeComponent === "component4" ? "active" : ""
            }`}
            onClick={() => setActiveComponent("component4")}
          >
            <Image alt="image" src="/setting.png"  height={20} width={20} />
            <p>Setting</p>
          </button>
        </div>
      </div>
      {renderComponent()}
    </div>
  );
}