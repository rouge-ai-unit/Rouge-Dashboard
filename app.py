import streamlit as st
import json
import time

# This is the prompt that would be sent to the Gemini API.
# It defines the AI agent's role and the data extraction task.
GEMINI_PROMPT = """
You are a web scraping agent designed to extract structured information from Eventbrite.com. When given a search query, you will navigate the Eventbrite website and perform a search. For each event that matches the keywords 'biotech', 'agriculture tech', or 'tech', extract the following details: Event Title, Location, Date, Time, and Price. If the price is free, note it as such. After collecting the data for all relevant events, format the output as a JSON object, where each event is an element in a JSON array. If the webpage does not contain any of the specified keywords, return an empty JSON array.
"""

def simulate_gemini_api_call(user_query, prompt):
    """
    This function simulates a call to the Gemini API with the given prompt and query.
    In a real application, you would replace this with actual API calls to a
    web scraping service and a large language model.

    Args:
        user_query (str): The search term entered by the user.
        prompt (str): The system prompt for the AI agent.

    Returns:
        str: A JSON string containing mock event data.
    """
    st.write(f"Simulating a scrape for the query: '{user_query}'")
    st.write("Using the following prompt for the AI agent:")
    st.code(prompt)

    # Mock response data for demonstration purposes
    mock_events_json = {
        "events": [
            {
                "Event Title": "Cutting-Edge Biotech Innovations",
                "Location": "San Francisco, CA",
                "Date": "October 15, 2025",
                "Time": "9:00 AM - 5:00 PM",
                "Price": "Free"
            },
            {
                "Event Title": "Future of Agriculture Tech Summit",
                "Location": "Virtual Event",
                "Date": "November 2, 2025",
                "Time": "10:00 AM - 2:00 PM (CST)",
                "Price": "$99.00"
            },
            {
                "Event Title": "Local Tech Meetup & Networking",
                "Location": "New York, NY",
                "Date": "September 20, 2025",
                "Time": "7:00 PM - 9:00 PM",
                "Price": "Free"
            },
            {
                "Event Title": "Next-Gen Tech Solutions Expo",
                "Location": "Austin, TX",
                "Date": "December 5-6, 2025",
                "Time": "9:00 AM - 6:00 PM",
                "Price": "$150.00 - $300.00"
            }
        ]
    }
    return json.dumps(mock_events_json)

# --- Streamlit Application UI ---
st.set_page_config(page_title="Eventbrite AI Scraper")

st.title("Eventbrite AI-Powered Event Scraper")
st.markdown("Enter a search query below to find events related to **biotech**, **agriculture tech**, and **tech** on Eventbrite.")

# Text input for the user's search query
user_input = st.text_input("Enter your search query:", placeholder="e.g., San Francisco tech events")

# Button to trigger the scraping process
if st.button("Search Events"):
    if not user_input:
        st.warning("Please enter a search query.")
    else:
        # Display a loading spinner while the process "runs"
        with st.spinner("Searching for events..."):
            time.sleep(2)  # Simulate network latency

            # Call the simulated API function
            json_response = simulate_gemini_api_call(user_input, GEMINI_PROMPT)

            try:
                # Parse the JSON response
                events_data = json.loads(json_response)
                events_list = events_data.get("events", [])

                if not events_list:
                    st.info(f"No events found for '{user_input}' with the specified keywords.")
                else:
                    st.success("Events found!")
                    # Display the data in a clean, interactive table
                    st.dataframe(events_list, use_container_width=True)

            except json.JSONDecodeError:
                st.error("Failed to parse the response from the AI agent.")
