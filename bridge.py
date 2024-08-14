import sys
import json
import time






# Import your necessary modules























#===========================================================================================
# Function to get all callable functions from the global scope
def get_functions():
    return {name: obj for name, obj in globals().items() if callable(obj)}

# Function to send JSON responses
def jsoncallback(d):
    print(json.dumps(d))
    sys.stdout.flush()

function_map = get_functions()

#print(sys.path)

jsoncallback({"type":"info", "functions":list(get_functions().keys())})


# Main loop to read and process input

time.sleep(1)

try:
    while True:
        for line in sys.stdin:
            line = line.rstrip()

            # Parse the input JSON
            _data = json.loads(line)
            function_name = _data["function"]
            args = _data["args"]

            # Check if the function exists in the function_map
            if function_name in function_map:
                func = function_map[function_name]
                try:
                    # Call the function with the provided arguments
                    result = func(*args)
                    # Send the result back as JSON
                    jsoncallback({"type":"result","error": False, "result": result})
                except Exception as e:
                    # Handle any exceptions that occur during function execution
                    jsoncallback({"type":"result","error": "executionerror", "message": str(e)})
            else:
                # Handle the case where the function is not found
                jsoncallback({"type":"result","error": "functionnotfound"})
except:
    jsoncallback({"type":"exit"})
