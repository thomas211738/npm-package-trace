from score_commit import score_commit

with open("test.diff", "r") as f:
    diff = f.read()

result = score_commit(diff)
print(result)