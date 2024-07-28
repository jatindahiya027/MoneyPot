"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

import Cookies from "universal-cookie";
const cookies = new Cookies();
export  default  function Transfers(props) {
  console.log("inside transfer");
  const hasFetchedData = useRef(false);
  const [markdown, setMarkdown] =  useState("fetching data");
  useEffect(() => {
    if (hasFetchedData.current) {
      return;
    }

    hasFetchedData.current = true;
    // console.log("I am here");
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      return;
    }

    fetch("/api/ai", {
      method: "GET",
      headers: {
        "Content-Type": "application/json", // Set the request headers to indicate JSON format
        "Authorization": `Bearer ${token}` // Include the JWT token in the Authorization header
      },
    })
      .then((res) => res.json()) // Parse the response data as JSON
      .then((data) => setMarkdown(data)) // Update the state with the fetched data
      
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="dashdata transdiv">
      <h1 className="headname">Transfers</h1>
      <button className="addbutt">
        Add <Image alt="image" src="/plus.png" width={12} height={12} />
      </button>
      <div className="tableenclosure">
        <table>
          <tbody>
            <tr>
              <th className="th thsticky">ID</th>
              <th className="th thsticky">Category</th>
              <th className="th thsticky">DESCRIPTION</th>
              <th className="th thsticky">AMOUNT</th>
              <th className="th thsticky">DATE</th>
              <th className="th thsticky">EDIT</th>
            </tr>
{props.trans.map((item, index) => (
            <tr className="light" key={index}>
              <td className="th">{item.transid}</td>
              <td className="th">{item.type}</td>
              <td className="th">
                <div class="cell-container">
                {item.description}
                </div>
              </td>
              <td className="th"><span>₹</span>{item.amount}</td>
              <td className="th">{item.date}</td>
              <td className="th">
                <div className="editbutton">
                  <button className="transbutton">
                    <Image alt="image" src="/edit.png" width={20} height={20} />
                    {/* Edit */}
                  </button>
                  <button className="transbutton">
                    <Image alt="image" src="/delete.png" width={20} height={20} />
                    {/* Delete */}
                  </button>
                </div>
              </td>
            </tr>
           ))}
          
          </tbody>
        </table>
      </div>
      <div className="aigen">
        <p className="subhead">AI Insights</p>
        <button className="bottombutt">
          Regenerate <Image alt="image" src="/reload.png" width={15} height={15} />
        </button>
        <div className="aigenerated light">
          <div>
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
