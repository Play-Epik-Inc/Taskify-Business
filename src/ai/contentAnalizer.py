import sys
import json
import re

def parse_input(text):
    #CHECK FOR '/CREATE' COMMAND
    multi_match = re.match(
        r"/create\d+\s+([^\s]+(?:\s*,\s*[^\s]+)*)\s+([^\s]+(?:\s*,\s*[^\s]+)*)\s+to\s+newer\s+([^\s]+(?:\s*,\s*[^\s]+)*)(?:\s+!category\s+([^\s]+(?:\s*,\s*[^\s]+)*))?",
        text, re.IGNORECASE
    )

    if multi_match:
        names = [n.strip() for n in multi_match.group(1).split(',')]
        prev_versions = [v.strip() for v in multi_match.group(2).split(',')]
        next_versions = [v.strip() for v in multi_match.group(3).split(',')]
        categories = [c.strip().lower() for c in multi_match.group(4).split(',')] if multi_match.group(4) else []

        max_len = max(len(names), len(prev_versions), len(next_versions), len(categories) if categories else 0)
        tasks = []

        for i in range(max_len):
            name = names[i] if i < len(names) else ""
            prev_version = prev_versions[i] if i < len(prev_versions) else ""
            next_version = next_versions[i] if i < len(next_versions) else ""
            category_raw = categories[i] if i < len(categories) else ""
            if category_raw == "maintenance":
                category = "softwareComponents"
            else:
                category = "fuoriManutenzione"
            tasks.append({
                "name": name,
                "prev_version": prev_version,
                "next_version": next_version,
                "category": category
            })
        return {"tasks": tasks}
    
    #CHECK FOR '/EDIT' COMMAND
    edit_match = re.match(
        r"/edit\s+([^\s]+)\s+!category\s+([^\s]+)", text, re.IGNORECASE
    )

    if edit_match:
        name = edit_match.group(1)
        category_raw = edit_match.group(2).lower()
        if category_raw == "maintenance":
            category = "softwareComponents"
        else:
            category = "fuoriManutenzione"
        return {
            "name": name,
            "category": category,
            "modify": True
        }

    #CHECK FOR '/CREATE' COMMAND
    match = re.match(
        r"/create\s+([^\s]+)\s+\(?([^\s)]+)\)?\s+to\s+newer\s+\(?([^\s)]+)\)?(?:\s+!category\s+([^\s]+))?",
        text, re.IGNORECASE
    )

    if match:
        name = match.group(1)
        prev_version = match.group(2)
        next_version = match.group(3)
        category_raw = (match.group(4) or "").lower()
        if category_raw == "maintenance":
            category = "softwareComponents"
        else:
            category = "fuoriManutenzione"
        return {
            "name": name,
            "prev_version": prev_version,
            "next_version": next_version,
            "category": category
        }
    elif (text == "/help"):
        return '<br><b>Commands for AI Assistant:</b> <br><br> ' \
        '<b>/create</b> = Create a Task or a list of Tasks (<b>add a number in front of the command "/create"</b>), the syntax is: <i>/create TaskName previousVersion to newer newerVersion !category maintenace/out</i> <br>' \
        '<br> <b>/edit</b> = Edit a Task, the syntax is: <i>/edit taskName !category maintenance/out </i> <br>' \
        '<br> <b>/clear</b> or <b>/cls</b> = Clear the chat. <br> ' \
        '<br> <b>/delete</b> = Delete a Task, the syntax is <i>/delete TaskName !category maintenance/out</i>.'
    
    #CHECK FOR HELLO OR HI COMBINATION
    hello_match = re.match(r"hello", text, re.IGNORECASE)
    hi_match = re.match(r"hi", text, re.IGNORECASE)

    if(hello_match or hi_match):
        return "HI! Welcome to AI Assistant of Taskify Business! write /help for more commands!"
    
    #CHECK FOR '/CLEAR' OR '/CLS' COMMAND
    cls_match = re.match(r"/cls", text, re.IGNORECASE)
    clear_match = re.match(r"/clear", text, re.IGNORECASE)

    if(clear_match or cls_match):
        return 'cleared'
    
    delete_match = re.match(r"/delete\s+([^\s]+)\s+!category\s+([^\s]+)", text, re.IGNORECASE)

    if(delete_match):
        name = delete_match.group(1)
        category_raw = (delete_match.group(2) or "").lower()
        if category_raw == "maintenance":
            category = "softwareComponents"
        else:
            category = "fuoriManutenzione"
        return{
            "name": name,
            "category": category,
            "type": 1
        }
    else:
        return 'Sorry, I am unable to elaborating your request, check your message and try again. if you need more help, type /help.'

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        return
    input_text = sys.argv[1]
    result = parse_input(input_text)
    if result:
        print(json.dumps(result))
    else:
        print(json.dumps({"Sorry, I am unable to elaborating your request, check your message and try again. if you need more help, type /help."}))

main()