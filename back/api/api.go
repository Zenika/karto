package api

import (
	"encoding/json"
	"fmt"
	"github.com/markbates/pkger"
	"karto/types"
	"log"
	"net/http"
	"sync"
)

type handler struct {
	mutex              sync.RWMutex
	lastAnalysisResult types.AnalysisResult
}

func newHandler() *handler {
	handler := &handler{
		lastAnalysisResult: types.AnalysisResult{
			Pods:          make([]*types.Pod, 0),
			PodIsolations: make([]*types.PodIsolation, 0),
			AllowedRoutes: make([]*types.AllowedRoute, 0),
			Services:      make([]*types.Service, 0),
			ReplicaSets:   make([]*types.ReplicaSet, 0),
			Deployments:   make([]*types.Deployment, 0),
		},
	}
	return handler
}

func (handler *handler) keepUpdated(resultsChannel <-chan types.AnalysisResult) {
	for {
		newResults := <-resultsChannel
		handler.mutex.Lock()
		handler.lastAnalysisResult = newResults
		handler.mutex.Unlock()
	}
}

func (handler *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	handler.mutex.RLock()
	defer handler.mutex.RUnlock()
	json.NewEncoder(w).Encode(handler.lastAnalysisResult)
}

func healthCheck(w http.ResponseWriter, _ *http.Request) {
	fmt.Fprintln(w, "OK")
}

func Expose(address string, resultsChannel <-chan types.AnalysisResult) {
	frontendHandler := http.FileServer(pkger.Dir("/frontendBuild"))
	apiHandler := newHandler()
	go apiHandler.keepUpdated(resultsChannel)
	mux := http.NewServeMux()
	mux.Handle("/", frontendHandler)
	mux.Handle("/api/analysisResult", apiHandler)
	mux.HandleFunc("/health", healthCheck)
	log.Printf("Listening to incoming requests on %s...\n", address)
	err := http.ListenAndServe(address, mux)
	if err != nil {
		log.Fatalln(err)
	}
}
